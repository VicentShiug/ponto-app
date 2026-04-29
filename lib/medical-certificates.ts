import { MedicalCertificate } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateISO, parseDateFromAPI, addDays } from "@/lib/dates";

/**
 * Fetch all medical certificates for a user that overlap a date range.
 */
export async function getCertificatesForDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<MedicalCertificate[]> {
  return prisma.medicalCertificate.findMany({
    where: {
      userId,
      OR: [
        // PARTIAL: date falls within [start, end]
        {
          type: "PARTIAL",
          date: { gte: start, lte: end },
        },
        // FULL_DAY: overlapping range [startDate, endDate] ∩ [start, end]
        {
          type: "FULL_DAY",
          startDate: { lte: end },
          endDate: { gte: start },
        },
      ],
    },
  });
}

/**
 * Check if a date is covered by a FULL_DAY certificate.
 * Returns the certificate if found, null otherwise.
 */
export function getFullDayCertificateForDate(
  dateISO: string,
  certificates: MedicalCertificate[]
): MedicalCertificate | null {
  for (const cert of certificates) {
    if (cert.type !== "FULL_DAY" || !cert.startDate || !cert.endDate) continue;
    const startISO = formatDateISO(cert.startDate);
    const endISO = formatDateISO(cert.endDate);
    if (dateISO >= startISO && dateISO <= endISO) return cert;
  }
  return null;
}

/**
 * Check if a date has a PARTIAL certificate.
 * Returns the certificate if found, null otherwise.
 */
export function getPartialCertificateForDate(
  dateISO: string,
  certificates: MedicalCertificate[]
): MedicalCertificate | null {
  for (const cert of certificates) {
    if (cert.type !== "PARTIAL" || !cert.date) continue;
    if (formatDateISO(cert.date) === dateISO) return cert;
  }
  return null;
}

/**
 * Calculate the duration in minutes of a PARTIAL certificate.
 */
export function getPartialCertificateMinutes(cert: MedicalCertificate): number {
  if (!cert.startTime || !cert.endTime) return 0;
  const [sh, sm] = cert.startTime.split(":").map(Number);
  const [eh, em] = cert.endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/**
 * Validate that a new certificate doesn't overlap with existing ones.
 * Returns true if there IS an overlap (i.e. invalid).
 */
export async function checkOverlap(
  userId: string,
  type: "PARTIAL" | "FULL_DAY",
  opts: {
    date?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    excludeId?: string;
  }
): Promise<boolean> {
  if (type === "PARTIAL" && opts.date) {
    const dateStart = new Date(`${opts.date}T00:00:00-03:00`);
    const dateEnd = new Date(`${opts.date}T23:59:59-03:00`);

    const existing = await prisma.medicalCertificate.findMany({
      where: {
        userId,
        id: opts.excludeId ? { not: opts.excludeId } : undefined,
        OR: [
          { type: "PARTIAL", date: { gte: dateStart, lte: dateEnd } },
          {
            type: "FULL_DAY",
            startDate: { lte: dateEnd },
            endDate: { gte: dateStart },
          },
        ],
      },
    });

    if (existing.length === 0) return false;

    // Check for FULL_DAY covering this date
    for (const cert of existing) {
      if (cert.type === "FULL_DAY") return true;
    }

    // Check PARTIAL time overlap
    for (const cert of existing) {
      if (cert.type === "PARTIAL" && cert.startTime && cert.endTime && opts.startTime && opts.endTime) {
        if (opts.startTime < cert.endTime && opts.endTime > cert.startTime) {
          return true;
        }
      }
    }

    return false;
  }

  if (type === "FULL_DAY" && opts.startDate && opts.endDate) {
    const rangeStart = new Date(`${opts.startDate}T00:00:00-03:00`);
    const rangeEnd = new Date(`${opts.endDate}T23:59:59-03:00`);

    const existing = await prisma.medicalCertificate.findMany({
      where: {
        userId,
        id: opts.excludeId ? { not: opts.excludeId } : undefined,
        OR: [
          { type: "PARTIAL", date: { gte: rangeStart, lte: rangeEnd } },
          {
            type: "FULL_DAY",
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          },
        ],
      },
    });

    return existing.length > 0;
  }

  return false;
}

/**
 * Get all dates covered by FULL_DAY certificates as ISO strings.
 */
export function getFullDayDates(certificates: MedicalCertificate[]): Set<string> {
  const dates = new Set<string>();
  for (const cert of certificates) {
    if (cert.type !== "FULL_DAY" || !cert.startDate || !cert.endDate) continue;
    let current = new Date(cert.startDate);
    const end = formatDateISO(cert.endDate);
    while (formatDateISO(current) <= end) {
      dates.add(formatDateISO(current));
      current = addDays(current, 1);
    }
  }
  return dates;
}
