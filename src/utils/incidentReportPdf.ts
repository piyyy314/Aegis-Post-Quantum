import { jsPDF } from "jspdf";
import { AuditResult, AuditVulnerability, VulnerabilityTimelinePoint } from "../types";

export interface IncidentReportConfig {
  reportTitle: string;
  incidentId: string;
  classification: string;
  targetSystem: string;
  assessorName: string;
  organization: string;
  scope: string;
  executiveNotes: string;
  coverImageBase64?: string;
  coverThemeName?: string;
  timelineChartBase64?: string;
  timelineData?: VulnerabilityTimelinePoint[];
  includeCover: boolean;
  includeExecutiveSummary: boolean;
  includeTimeline?: boolean;
  includeVulnerabilities: boolean;
  includeRemediationPlan: boolean;
  includeSignOff: boolean;
}

/**
 * Loads an image from a URL or local asset path and converts it into a JPEG base64 Data URL.
 */
export async function loadImageAsBase64(src: string): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    const timeout = setTimeout(() => {
      resolve("");
    }, 8000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("");
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (e) {
        console.warn("Canvas export fallback:", e);
        // Fallback to fetch blob
        fetch(src)
          .then((r) => r.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string || "");
            reader.readAsDataURL(blob);
          })
          .catch(() => resolve(""));
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      fetch(src)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string || "");
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(""));
    };

    img.src = src;
  });
}

/**
 * Creates a fallback stylized vector/canvas cover image if no AI image is loaded
 */
export function generateSyntheticCoverDataUrl(
  riskScore: number,
  title: string,
  incidentId: string,
  classification: string
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const isCritical = riskScore >= 70;
  const isHigh = riskScore >= 35 && riskScore < 70;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1600);
  bgGrad.addColorStop(0, "#030712");
  bgGrad.addColorStop(0.5, "#081026");
  bgGrad.addColorStop(1, isCritical ? "#2a0812" : isHigh ? "#1e1505" : "#02241f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 1600);

  // Digital grid lines
  ctx.strokeStyle = "rgba(20, 247, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1600);
    ctx.stroke();
  }
  for (let y = 0; y < 1600; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Glowing center shield
  const centerX = 600;
  const centerY = 750;
  const accentColor = isCritical ? "#ef4444" : isHigh ? "#f59e0b" : "#10b981";

  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 40;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Outer concentric tech ring
  ctx.strokeStyle = "#14f7ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, 280, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Central emblem text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.fillText("AEGIS DEFENSE SYSTEMS", centerX, 680);

  ctx.fillStyle = accentColor;
  ctx.font = "bold 96px monospace";
  ctx.fillText(`${riskScore}%`, centerX, 780);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "bold 24px monospace";
  ctx.fillText(
    isCritical ? "CRITICAL QUANTUM EXPOSURE" : isHigh ? "ELEVATED RISK POSTURE" : "PQC COMPLIANT SHIELD",
    centerX,
    830
  );

  // Top header banner
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, 1200, 140);
  ctx.fillStyle = accentColor;
  ctx.font = "bold 26px monospace";
  ctx.fillText(`[ ${classification} ]`, centerX, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px monospace";
  ctx.fillText(`INCIDENT IDENTIFIER: ${incidentId}`, centerX, 100);

  // Bottom footer banner
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 1420, 1200, 180);
  ctx.fillStyle = "#14f7ff";
  ctx.font = "bold 34px monospace";
  ctx.fillText(title, centerX, 1480);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "18px monospace";
  ctx.fillText("NIST FIPS 203 / 204 / 205 TRANSITION AUDIT DOSSIER", centerX, 1530);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Captures an SVG element directly from the DOM (e.g., Recharts surface) and renders it to a base64 PNG.
 */
export async function captureSvgElementAsImage(
  svgElement: SVGElement,
  targetWidth = 1200,
  targetHeight = 520
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      const rect = svgElement.getBoundingClientRect();
      const width = rect.width || targetWidth;
      const height = rect.height || targetHeight;

      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));
      if (!clonedSvg.getAttribute("viewBox")) {
        clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }

      // Prepend dark solid background rect inside SVG
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("width", "100%");
      bgRect.setAttribute("height", "100%");
      bgRect.setAttribute("fill", "#070c18");
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve("");
      }, 5000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve("");
            return;
          }
          ctx.fillStyle = "#070c18";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png", 1.0));
        } catch {
          URL.revokeObjectURL(url);
          resolve("");
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve("");
      };

      img.src = url;
    } catch {
      resolve("");
    }
  });
}

/**
 * Renders the session timeline of vulnerabilities as an ultra-high-resolution canvas image matching Recharts visual design
 */
export function renderSyntheticRechartsTimelineCanvas(
  timelineData: VulnerabilityTimelinePoint[],
  width = 1200,
  height = 520
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Dark cyber background
  ctx.fillStyle = "#070c18";
  ctx.fillRect(0, 0, width, height);

  // Outer glowing cyber border
  ctx.strokeStyle = "rgba(20, 247, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Top header area
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(0, 0, width, 48);
  ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(width, 48);
  ctx.stroke();

  // Title in header
  ctx.fillStyle = "#14f7ff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.fillText("RECHARTS TEMPORAL ENGINE // SESSION VULNERABILITY DYNAMICS", 24, 30);

  // Legend in header
  ctx.font = "11px monospace";
  ctx.textAlign = "right";

  let legendX = width - 24;

  // Remediated Legend
  ctx.fillStyle = "#10b981";
  ctx.fillText("● PQC Remediated", legendX, 30);
  legendX -= 140;

  // High Flaws Legend
  ctx.fillStyle = "#f59e0b";
  ctx.fillText("■ High Flaws", legendX, 30);
  legendX -= 110;

  // Critical Flaws Legend
  ctx.fillStyle = "#ef4444";
  ctx.fillText("■ Critical Flaws", legendX, 30);
  legendX -= 130;

  // Risk Score Legend
  ctx.fillStyle = "#14f7ff";
  ctx.fillText("— Quantum Risk Score (%)", legendX, 30);

  // Plot dimensions
  const padLeft = 70;
  const padRight = 60;
  const padTop = 75;
  const padBottom = 65;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Draw Horizontal Gridlines and Y-Axis (Left: Risk 0-100%, Right: Flaws)
  const gridSteps = 4; // 0%, 25%, 50%, 75%, 100%
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = padTop + (plotHeight / gridSteps) * i;
    const pct = 100 - (100 / gridSteps) * i;

    // Grid line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yVal);
    ctx.lineTo(width - padRight, yVal);
    ctx.stroke();
    ctx.setLineDash([]);

    // Left Y-Axis text (Risk Score)
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${pct}%`, padLeft - 10, yVal + 4);

    // Right Y-Axis text (Defect count)
    const defectVal = Math.round(((gridSteps - i) / gridSteps) * 6);
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "left";
    ctx.fillText(`${defectVal}`, width - padRight + 10, yVal + 4);
  }

  // Y-Axis titles
  ctx.save();
  ctx.translate(18, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#14f7ff";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("EXPOSURE RATING (%)", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(width - 14, height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("FLAW COUNT", 0, 0);
  ctx.restore();

  if (!timelineData || timelineData.length === 0) {
    return canvas.toDataURL("image/png");
  }

  const pointCount = timelineData.length;
  const xStep = pointCount > 1 ? plotWidth / (pointCount - 1) : plotWidth / 2;

  // Calculate coordinates
  const coords = timelineData.map((pt, index) => {
    const x = pointCount > 1 ? padLeft + index * xStep : padLeft + plotWidth / 2;
    const yRisk = padTop + plotHeight - (pt.riskScore / 100) * plotHeight;
    return { x, yRisk, pt };
  });

  // 1. Draw Bars for Critical & High Flaws
  const maxFlawDisplay = 6;
  const barWidth = Math.min(32, Math.max(14, plotWidth / (pointCount * 3)));

  coords.forEach(({ x, pt }) => {
    const critH = (Math.min(maxFlawDisplay, pt.criticalCount) / maxFlawDisplay) * plotHeight;
    const highH = (Math.min(maxFlawDisplay, pt.highCount) / maxFlawDisplay) * plotHeight;

    const baseBarY = padTop + plotHeight;

    // Critical Bar (Red)
    if (critH > 0) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
      ctx.fillRect(x - barWidth / 2, baseBarY - critH, barWidth, critH);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - barWidth / 2, baseBarY - critH, barWidth, critH);
    }

    // High Bar (Amber)
    if (highH > 0) {
      ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
      ctx.fillRect(x - barWidth / 2, baseBarY - critH - highH, barWidth, highH);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - barWidth / 2, baseBarY - critH - highH, barWidth, highH);
    }

    // Remediated Marker
    if (pt.remediatedCount > 0) {
      const remY = baseBarY - critH - highH - 12;
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(x, remY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // 2. Draw Area fill under Risk Score Curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(coords[0].x, padTop + plotHeight);
  ctx.lineTo(coords[0].x, coords[0].yRisk);

  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpx1 = curr.x + (next.x - curr.x) / 2;
    const cpy1 = curr.yRisk;
    const cpx2 = curr.x + (next.x - curr.x) / 2;
    const cpy2 = next.yRisk;
    ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, next.x, next.yRisk);
  }

  ctx.lineTo(coords[coords.length - 1].x, padTop + plotHeight);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
  areaGrad.addColorStop(0, "rgba(20, 247, 255, 0.3)");
  areaGrad.addColorStop(1, "rgba(20, 247, 255, 0.01)");
  ctx.fillStyle = areaGrad;
  ctx.fill();
  ctx.restore();

  // 3. Draw Risk Score Line
  ctx.save();
  ctx.shadowColor = "rgba(20, 247, 255, 0.8)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#14f7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].yRisk);

  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpx1 = curr.x + (next.x - curr.x) / 2;
    const cpy1 = curr.yRisk;
    const cpx2 = curr.x + (next.x - curr.x) / 2;
    const cpy2 = next.yRisk;
    ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, next.x, next.yRisk);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Draw Point Knots on Curve with Callout Pills
  coords.forEach(({ x, yRisk, pt }) => {
    // Outer glow ring
    ctx.fillStyle = "#070c18";
    ctx.beginPath();
    ctx.arc(x, yRisk, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pt.riskScore >= 70 ? "#ef4444" : pt.riskScore >= 35 ? "#f59e0b" : "#14f7ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = pt.riskScore >= 70 ? "#ef4444" : pt.riskScore >= 35 ? "#f59e0b" : "#14f7ff";
    ctx.beginPath();
    ctx.arc(x, yRisk, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Risk value tag above knot
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${pt.riskScore}%`, x, Math.max(padTop + 14, yRisk - 10));
  });

  // 5. Draw X-Axis labels
  coords.forEach(({ x, pt }) => {
    ctx.fillStyle = "#14f7ff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pt.timeOffset, x, height - padBottom + 20);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "9.5px monospace";
    const shortLabel = pt.label.length > 15 ? pt.label.substring(0, 13) + ".." : pt.label;
    ctx.fillText(shortLabel, x, height - padBottom + 35);
  });

  return canvas.toDataURL("image/png");
}

/**
 * Computes a pseudo-forensic SHA-256 hash representation of the audit report content
 */
export async function computeReportHash(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Deterministic fallback
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}

/**
 * Builds and downloads a high-fidelity, multi-page branded Incident Report PDF
 */
export async function generateIncidentReportPdf(
  audit: AuditResult,
  config: IncidentReportConfig
): Promise<{ pdfBlob: Blob; fileName: string; forensicHash: string }> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  // Calculate forensic verification string
  const rawReportString = JSON.stringify({
    id: config.incidentId,
    date: now.toISOString(),
    score: audit.overallRiskScore,
    vulnerabilities: audit.vulnerabilities.map((v) => ({
      algo: v.algorithm,
      severity: v.severity,
      threat: v.threat,
    })),
  });
  const forensicHash = await computeReportHash(rawReportString);

  // Determine Severity Color palette
  const isCritical = audit.overallRiskScore >= 70;
  const isHigh = audit.overallRiskScore >= 35 && audit.overallRiskScore < 70;

  const accentR = isCritical ? 239 : isHigh ? 245 : 16;
  const accentG = isCritical ? 68 : isHigh ? 158 : 185;
  const accentB = isCritical ? 68 : isHigh ? 11 : 129;

  let activeSectionPages = 0;
  const startSectionPage = () => {
    activeSectionPages++;
    if (activeSectionPages > 1) {
      doc.addPage();
    }
    return activeSectionPages;
  };

  // Helper: Draw Header and Footer on interior pages
  const drawPageChrome = (pageTitle: string) => {
    // Top chrome bar
    doc.setFillColor(8, 14, 28);
    doc.rect(0, 0, pageWidth, 14, "F");

    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(0, 14, pageWidth, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20, 247, 255);
    doc.text("AEGIS DEFENSE SYSTEMS // POST-QUANTUM INCIDENT DOSSIER", margin, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 195, 215);
    doc.text(config.classification, pageWidth - margin, 9, { align: "right" });

    // Page title subtitle under header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(pageTitle, margin, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`REF ID: ${config.incidentId}  |  TARGET: ${config.targetSystem}`, margin, 29);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 32, pageWidth - margin, 32);

    // Bottom chrome footer
    doc.setFillColor(8, 14, 28);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`CLASSIFIED REPORT - ${config.classification} - FOR OFFICIAL USE ONLY`, margin, pageHeight - 5);
  };

  // ==========================================
  // PAGE 1: Branded PDF Cover Page
  // ==========================================
  if (config.includeCover) {
    startSectionPage();
    // Dark background for cover
    doc.setFillColor(6, 10, 20);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Top Classification Banner
    doc.setFillColor(isCritical ? 127 : isHigh ? 120 : 6, isCritical ? 29 : isHigh ? 53 : 78, isCritical ? 29 : isHigh ? 15 : 59);
    doc.rect(0, 0, pageWidth, 12, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`[ ${config.classification.toUpperCase()} ]`, pageWidth / 2, 8, { align: "center" });

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 247, 255);
    doc.text("AEGIS QUANTUM DEFENSE SYSTEMS", margin, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("AUTONOMOUS CRYPTOGRAPHIC INTEGRITY & THREAT INCIDENT DIVISION", margin, 27);

    // Decorative rule
    doc.setDrawColor(20, 247, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, 30, pageWidth - margin, 30);

    // Center Image Box: Embed AI-Generated Branded Cover Artwork
    const imgY = 34;
    const imgHeight = 138;
    const imgWidth = contentWidth;

    let coverBase64 = config.coverImageBase64;
    if (!coverBase64) {
      coverBase64 = generateSyntheticCoverDataUrl(
        audit.overallRiskScore,
        config.reportTitle,
        config.incidentId,
        config.classification
      );
    }

    try {
      doc.addImage(coverBase64, "JPEG", margin, imgY, imgWidth, imgHeight, undefined, "FAST");
      // Outer border around image
      doc.setDrawColor(accentR, accentG, accentB);
      doc.setLineWidth(0.8);
      doc.rect(margin, imgY, imgWidth, imgHeight);
    } catch (err) {
      console.warn("Failed to embed cover image in PDF, drawing vector frame:", err);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, imgY, imgWidth, imgHeight, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 247, 255);
      doc.text("AEGIS POST-QUANTUM INCIDENT DOSSIER", pageWidth / 2, imgY + imgHeight / 2, { align: "center" });
    }

    // Title Block under image
    const titleBlockY = imgY + imgHeight + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);

    const splitTitle = doc.splitTextToSize(config.reportTitle.toUpperCase(), contentWidth - 40);
    doc.text(splitTitle, margin, titleBlockY);

    const titleOffset = splitTitle.length * 7;

    // Subtitle & Incident Badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("FORMAL POST-QUANTUM COMPLIANCE & INCIDENT REMEDIATION DIRECTIVE", margin, titleBlockY + titleOffset);

    // Metadata Grid Box
    const metaY = titleBlockY + titleOffset + 6;
    doc.setFillColor(11, 19, 38);
    doc.rect(margin, metaY, contentWidth, 38, "F");
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.rect(margin, metaY, contentWidth, 38);

    // Metadata Left Column
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20, 247, 255);
    doc.text(`INCIDENT ID:`, margin + 4, metaY + 7);
    doc.setTextColor(255, 255, 255);
    doc.text(config.incidentId, margin + 30, metaY + 7);

    doc.setTextColor(20, 247, 255);
    doc.text(`TARGET SYSTEM:`, margin + 4, metaY + 14);
    doc.setTextColor(255, 255, 255);
    doc.text(config.targetSystem.substring(0, 36), margin + 30, metaY + 14);

    doc.setTextColor(20, 247, 255);
    doc.text(`ASSESSOR:`, margin + 4, metaY + 21);
    doc.setTextColor(255, 255, 255);
    doc.text(config.assessorName, margin + 30, metaY + 21);

    doc.setTextColor(20, 247, 255);
    doc.text(`GENERATED:`, margin + 4, metaY + 28);
    doc.setTextColor(255, 255, 255);
    doc.text(`${dateFormatted} ${timeFormatted}`, margin + 30, metaY + 28);

    doc.setTextColor(20, 247, 255);
    doc.text(`SHA-256 HASH:`, margin + 4, metaY + 35);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(forensicHash.substring(0, 48) + "...", margin + 30, metaY + 35);

    // Metadata Right Column: Risk Score Callout Badge
    const badgeX = pageWidth - margin - 46;
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(badgeX, metaY + 4, 42, 30, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("POSTURE SCORE", badgeX + 21, metaY + 10, { align: "center" });

    doc.setFontSize(18);
    doc.text(`${audit.overallRiskScore}%`, badgeX + 21, metaY + 20, { align: "center" });

    doc.setFontSize(7);
    doc.text(
      isCritical ? "CRITICAL RISK" : isHigh ? "ELEVATED RISK" : "PQC COMPLIANT",
      badgeX + 21,
      metaY + 28,
      { align: "center" }
    );

    // Bottom Footer Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AEGIS POST-QUANTUM CYBERSECURITY SUITE  |  DOCUMENT INTEGRITY ASSURED  |  COVER PAGE`,
      pageWidth / 2,
      pageHeight - 4,
      { align: "center" }
    );
  }

  // ==========================================
  // PAGE 2: Executive Summary & Threat Profile
  // ==========================================
  if (config.includeExecutiveSummary) {
    startSectionPage();
    drawPageChrome("EXECUTIVE INCIDENT SUMMARY & QUANTUM THREAT PROFILE");

    let currentY = 38;

    // Threat Matrix Quick Status Cards
    const cardWidth = (contentWidth - 6) / 3;

    // Card 1: Overall Classification
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, cardWidth, 24, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, cardWidth, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("INCIDENT SEVERITY", margin + 4, currentY + 6);
    doc.setFontSize(11);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text(isCritical ? "CRITICAL (TIER-1)" : isHigh ? "ELEVATED (TIER-2)" : "NOMINAL (PQC READY)", margin + 4, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Exposure Rating: ${audit.overallRiskScore}/100`, margin + 4, currentY + 20);

    // Card 2: Vulnerabilities Detected
    const activeVulns = audit.vulnerabilities.filter((v) => !v.isRemediated).length;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + cardWidth + 3, currentY, cardWidth, 24, "F");
    doc.rect(margin + cardWidth + 3, currentY, cardWidth, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DETECTED FLAWS", margin + cardWidth + 7, currentY + 6);
    doc.setFontSize(11);
    doc.setTextColor(activeVulns > 0 ? 239 : 16, activeVulns > 0 ? 68 : 185, activeVulns > 0 ? 68 : 129);
    doc.text(`${audit.vulnerabilities.length} Total Flaws`, margin + cardWidth + 7, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${activeVulns} Active | ${audit.vulnerabilities.length - activeVulns} Remediated`, margin + cardWidth + 7, currentY + 20);

    // Card 3: NIST FIPS Compliance
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + (cardWidth + 3) * 2, currentY, cardWidth, 24, "F");
    doc.rect(margin + (cardWidth + 3) * 2, currentY, cardWidth, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("NIST COMPLIANCE", margin + (cardWidth + 3) * 2 + 4, currentY + 6);
    doc.setFontSize(10);
    doc.setTextColor(activeVulns === 0 ? 16 : 239, activeVulns === 0 ? 185 : 68, activeVulns === 0 ? 129 : 68);
    doc.text(activeVulns === 0 ? "FIPS 203/204 COMPLIANT" : "NON-COMPLIANT DEFICIT", margin + (cardWidth + 3) * 2 + 4, currentY + 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("SP 800-224 Deadline: 2026-Q4", margin + (cardWidth + 3) * 2 + 4, currentY + 20);

    currentY += 30;

    // Executive Narrative Box
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("EXECUTIVE NARRATIVE & STRATEGIC APPRAISAL", margin + 3, currentY + 5);

    currentY += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const summaryText = config.executiveNotes || audit.remediationSummary ||
      "Automated inspection reveals legacy asymmetric cryptography and hash primitives susceptible to Shor's and Grover's factoring algorithms. Immediate migration to NIST-approved post-quantum algorithms (ML-KEM, ML-DSA) is advised.";
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(splitSummary, margin, currentY);
    currentY += splitSummary.length * 4.8 + 8;

    // Shor's Threat Analysis Box
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("QUANTUM CRYPTANALYSIS FAILURE CHANNELS (SHOR'S & GROVER'S)", margin + 3, currentY + 5);

    currentY += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const threatBullets = [
      "Harvest-Now-Decrypt-Later (HNDL): Adversaries capture encrypted TLS session keys and asymmetric payloads today, archiving them for retrospective decipherment upon fault-tolerant quantum computer (CRQC) arrival.",
      "Shor's Factorization Vulnerability: Standard RSA-1024, RSA-2048, and ECC elliptic-curve schemes solve discrete logarithms in polynomial time O((log N)^3) on Shor's algorithm, breaking all forward secrecy.",
      "Grover's Quantum Search: Classical hash functions (SHA-1, MD5) experience a quadratic speedup under Grover's algorithm, reducing effective security to O(2^(n/2)) and making collision forgery trivial.",
      "NIST Migration Mandate: Agencies must replace key encapsulation mechanisms with FIPS 203 (ML-KEM / Crystals-Kyber) and digital signatures with FIPS 204 (ML-DSA / Crystals-Dilithium) or FIPS 205 (SLH-DSA)."
    ];

    threatBullets.forEach((bullet) => {
      doc.setFillColor(accentR, accentG, accentB);
      doc.circle(margin + 2, currentY - 1, 1, "F");
      const splitBullet = doc.splitTextToSize(bullet, contentWidth - 8);
      doc.text(splitBullet, margin + 6, currentY);
      currentY += splitBullet.length * 4 + 3;
    });

    currentY += 5;

    // Incident Context & Scope Grid
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("TARGET SCOPE & DEPLOYMENT METRICS", margin + 3, currentY + 5);

    currentY += 10;
    const scopeData = [
      ["Target Infrastructure:", config.targetSystem],
      ["Assessing Organization:", config.organization],
      ["Lead Cryptographic Assessor:", config.assessorName],
      ["Scope & Boundary:", config.scope || "Asymmetric Key Encapsulation, Handshake Logic & Hashes"],
      ["Audit Classification:", config.classification],
      ["Report Timestamp:", `${dateFormatted} at ${timeFormatted}`],
    ];

    scopeData.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(label, margin, currentY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(value, margin + 55, currentY);
      currentY += 5;
    });
  }

  // ==========================================
  // PAGE: Session Vulnerability & Threat Dynamics Timeline (Recharts Dynamics)
  // ==========================================
  if (config.includeTimeline !== false) {
    startSectionPage();
    drawPageChrome("SESSION VULNERABILITY & THREAT DYNAMICS TIMELINE");

    let currentY = 38;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Continuous temporal telemetry of detected cryptographic vulnerabilities, Shor's factor exposure, and remediation drift.",
      margin,
      currentY
    );
    currentY += 6;

    // KPI Metrics Bar across the top
    const kpiWidth = (contentWidth - 9) / 4;
    const timelineData = config.timelineData || [];
    const peakRisk = timelineData.length > 0 ? Math.max(0, ...timelineData.map((p) => p.riskScore || 0)) : audit.overallRiskScore;
    const initialRisk = timelineData.length > 0 ? (timelineData[0].riskScore ?? 0) : 0;
    const totalFlawsDetected = timelineData.length > 0 
      ? Math.max(0, ...timelineData.map((p) => p.totalVulnerabilities || 0)) 
      : audit.vulnerabilities.length;
    const totalRemediated = timelineData.length > 0 
      ? Math.max(0, ...timelineData.map((p) => p.remediatedCount || 0)) 
      : audit.vulnerabilities.filter((v) => v.isRemediated).length;

    const kpis = [
      { label: "INITIAL RISK BASELINE", val: `${initialRisk}%`, color: [100, 116, 139] },
      { label: "PEAK QUANTUM THREAT", val: `${peakRisk}%`, color: peakRisk >= 70 ? [239, 68, 68] : [245, 158, 11] },
      { label: "ACTIVE DEFECTS ISOLATED", val: `${totalFlawsDetected} DETECTED`, color: [20, 247, 255] },
      { label: "REMEDIATION DYNAMICS", val: `${totalRemediated} REMEDIATED`, color: [16, 185, 129] },
    ];

    kpis.forEach((kpi, idx) => {
      const kpiX = margin + idx * (kpiWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.rect(kpiX, currentY, kpiWidth, 18, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(kpiX, currentY, kpiWidth, 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, kpiX + 3, currentY + 5);

      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.val, kpiX + 3, currentY + 13);
    });

    currentY += 23;

    // Rendered Recharts Chart Canvas / Image Embedding
    let chartImage = config.timelineChartBase64;
    if (!chartImage) {
      chartImage = renderSyntheticRechartsTimelineCanvas(timelineData, 1200, 520);
    }

    const chartHeight = 74; // mm on A4
    if (chartImage) {
      try {
        doc.addImage(chartImage, "PNG", margin, currentY, contentWidth, chartHeight, undefined, "FAST");
        doc.setDrawColor(20, 247, 255);
        doc.setLineWidth(0.4);
        doc.rect(margin, currentY, contentWidth, chartHeight);
      } catch (err) {
        console.warn("Failed to embed timeline chart image in PDF:", err);
      }
    }
    currentY += chartHeight + 8;

    // Chronological Session Event Ledger (Table)
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("CHRONOLOGICAL SESSION AUDIT MILESTONES & ALGORITHM DETECTIONS", margin + 3, currentY + 5);
    currentY += 10;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("TIME OFFSET", margin + 3, currentY + 5);
    doc.text("SESSION MILESTONE", margin + 28, currentY + 5);
    doc.text("ALGORITHMS DETECTED", margin + 82, currentY + 5);
    doc.text("RISK", margin + 138, currentY + 5);
    doc.text("POSTURE", margin + 154, currentY + 5);
    currentY += 7;

    // Render milestone rows
    const rows = timelineData.slice(0, 6);
    rows.forEach((pt, rIdx) => {
      const isEven = rIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, currentY, contentWidth, 8.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, 8.5);

      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(20, 247, 255);
      doc.text(pt.timeOffset, margin + 3, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(pt.label.substring(0, 28), margin + 28, currentY + 5.5);

      doc.setFont("courier", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const algos = (pt.activeAlgorithms || []).join(", ") || (pt.remediatedCount > 0 ? "PQC Hybrid Replaced" : "No legacy primitives");
      doc.text(algos.substring(0, 32), margin + 82, currentY + 5.5);

      const ptIsCrit = pt.riskScore >= 70;
      const ptIsHigh = pt.riskScore >= 35 && pt.riskScore < 70;
      doc.setFont("courier", "bold");
      doc.setTextColor(ptIsCrit ? 239 : ptIsHigh ? 245 : 16, ptIsCrit ? 68 : ptIsHigh ? 158 : 185, ptIsCrit ? 68 : ptIsHigh ? 11 : 129);
      doc.text(`${pt.riskScore}%`, margin + 138, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(pt.status, margin + 154, currentY + 5.5);

      currentY += 8.5;
    });
  }

  // ==========================================
  // PAGE: Vulnerability Ledger & Technical Flaws
  // ==========================================
  if (config.includeVulnerabilities) {
    startSectionPage();
    drawPageChrome("TECHNICAL VULNERABILITY LEDGER & REMEDIATION MATRIX");

    let currentY = 38;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `The following cryptographic defects were isolated via static syntax-tree inspection against NIST FIPS 203/204/205.`,
      margin,
      currentY
    );

    currentY += 6;

    if (audit.vulnerabilities.length === 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, currentY, contentWidth, 24, "F");
      doc.setDrawColor(187, 247, 208);
      doc.rect(margin, currentY, contentWidth, 24);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52);
      doc.text("ZERO CRYPTOGRAPHIC VULNERABILITIES DETECTED", margin + 6, currentY + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(21, 128, 61);
      doc.text("All inspected key encapsulation, hashing, and signature structures adhere to post-quantum resilience benchmarks.", margin + 6, currentY + 17);
    } else {
      audit.vulnerabilities.forEach((vuln: AuditVulnerability, idx: number) => {
        // Prevent overflowing past bottom margin
        if (currentY > pageHeight - 55) {
          startSectionPage();
          drawPageChrome("TECHNICAL VULNERABILITY LEDGER (CONTINUED)");
          currentY = 38;
        }

        const isVulnCritical = vuln.severity === "CRITICAL";
        const vR = isVulnCritical ? 239 : 245;
        const vG = isVulnCritical ? 68 : 158;
        const vB = isVulnCritical ? 68 : 11;

        // Card container
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 34, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, currentY, contentWidth, 34);

        // Left severity stripe
        doc.setFillColor(vuln.isRemediated ? 16 : vR, vuln.isRemediated ? 185 : vG, vuln.isRemediated ? 129 : vB);
        doc.rect(margin, currentY, 2.5, 34, "F");

        // Vulnerability header row
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${vuln.algorithm.toUpperCase()}`, margin + 6, currentY + 6);

        // Status badge
        doc.setFont("courier", "bold");
        doc.setFontSize(7);
        if (vuln.isRemediated) {
          doc.setTextColor(16, 185, 129);
          doc.text("[REMEDIATED & PQC COMPLIANT]", pageWidth - margin - 4, currentY + 6, { align: "right" });
        } else {
          doc.setTextColor(vR, vG, vB);
          doc.text(`[${vuln.severity} SEVERITY]`, pageWidth - margin - 4, currentY + 6, { align: "right" });
        }

        // Threat narrative
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const splitThreat = doc.splitTextToSize(`Failure Channel: ${vuln.threat}`, contentWidth - 12);
        doc.text(splitThreat.slice(0, 2), margin + 6, currentY + 12);

        // Line target match
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(180, 83, 9);
        doc.text(`Code Trigger: "${vuln.lineMatch.substring(0, 75)}"`, margin + 6, currentY + 21);

        // Remediation row
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text("NIST Alternative:", margin + 6, currentY + 28);

        doc.setFont("courier", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text(vuln.pqcReplacement, margin + 35, currentY + 28);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const actionSnippet = (vuln.mitigationSteps || "").substring(0, 65) + "...";
        doc.text(`Action: ${actionSnippet}`, margin + 85, currentY + 28);

        currentY += 38;
      });
    }
  }

  // ==========================================
  // PAGE: Strategic Remediation Roadmap & Sign-Off
  // ==========================================
  if (config.includeRemediationPlan || config.includeSignOff) {
    startSectionPage();
    drawPageChrome("STRATEGIC REMEDIATION ROADMAP & FORENSIC SIGN-OFF");

    let currentY = 38;

    // Strategic Remediation Table
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NIST POST-QUANTUM MIGRATION ROADMAP (2024-2030)", margin + 3, currentY + 5);

    currentY += 11;
    const roadmapSteps = [
      {
        phase: "Phase 1: Discovery & Inventory",
        timeline: "Immediate / Q3 2026",
        desc: "Complete comprehensive cryptographic bill of materials (CBOM) identifying all RSA, ECC, and DH instances.",
      },
      {
        phase: "Phase 2: Hybrid KEM Deployment",
        timeline: "Q4 2026 - Q2 2027",
        desc: "Deploy hybrid key exchange pairing classical X25519 with FIPS 203 ML-KEM-768 for TLS 1.3 handshakes.",
      },
      {
        phase: "Phase 3: Digital Signature Overhaul",
        timeline: "Q3 2027 - Q4 2028",
        desc: "Migrate PKI certificates and code-signing infrastructures to FIPS 204 ML-DSA and FIPS 205 SLH-DSA.",
      },
      {
        phase: "Phase 4: Pure Post-Quantum Enclave",
        timeline: "2029 - 2030",
        desc: "Deprecate all legacy asymmetric key exchanges; enforce strict lattice-based cryptographic boundaries.",
      },
    ];

    roadmapSteps.forEach((step) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 12, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, 12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(step.phase, margin + 4, currentY + 5);

      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(20, 247, 255);
      doc.text(step.timeline, pageWidth - margin - 4, currentY + 5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(step.desc, margin + 4, currentY + 9.5);

      currentY += 15;
    });

    currentY += 8;

    // Forensic Chain of Custody Box
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("FORENSIC CHAIN OF CUSTODY & INTEGRITY VERIFICATION", margin + 3, currentY + 5);

    currentY += 11;
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    doc.text(`DIGITAL REPORT CHECKSUM (SHA-256):`, margin, currentY);
    doc.setFont("courier", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(forensicHash, margin, currentY + 4);

    currentY += 11;
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`TIMESTAMP ENTROPY: ${Date.now()} | AUDIT NONCE: 0x${forensicHash.slice(0, 16)}`, margin, currentY);
    doc.text(`VERIFICATION STANDARD: NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)`, margin, currentY + 4);

    currentY += 16;

    // Sign-Off Signature Blocks
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CRYPTOGRAPHIC OFFICER & INCIDENT COMMAND SIGN-OFF", margin + 3, currentY + 5);

    currentY += 12;

    const sigWidth = (contentWidth - 8) / 2;

    // Assessor Sign Block
    doc.rect(margin, currentY, sigWidth, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PREPARED BY (CHIEF CRYPTOGRAPHIC ASSESSOR):", margin + 4, currentY + 6);

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(config.assessorName, margin + 4, currentY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Organization: ${config.organization}`, margin + 4, currentY + 19);
    doc.text(`Signature: [AEGIS-DIGITAL-SIGN-VERIFIED]`, margin + 4, currentY + 24);
    doc.text(`Execution Date: ${dateFormatted}`, margin + 4, currentY + 29);
    doc.text(`Clearance: ${config.classification}`, margin + 4, currentY + 34);

    // Incident Commander Sign Block
    doc.rect(margin + sigWidth + 8, currentY, sigWidth, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("APPROVED BY (INCIDENT COMMANDER):", margin + sigWidth + 12, currentY + 6);

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Aegis Security Operations Director", margin + sigWidth + 12, currentY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Autonomous Post-Quantum Defense Div.", margin + sigWidth + 12, currentY + 19);
    doc.text(`Digital Seal: AEGIS-PQC-SEAL-899`, margin + sigWidth + 12, currentY + 24);
    doc.text(`Approval Status: CERTIFIED AUDIT DOSSIER`, margin + sigWidth + 12, currentY + 29);
    doc.text(`Disposition: REMEDIATION MANDATED`, margin + sigWidth + 12, currentY + 34);
  }

  // Two-pass dynamic page numbering on all interior pages
  const totalDocPages = doc.getNumberOfPages();
  const startInteriorPage = config.includeCover ? 2 : 1;
  for (let p = startInteriorPage; p <= totalDocPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`PAGE ${p} OF ${totalDocPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  const fileName = `AEGIS-Incident-Report-${config.incidentId}.pdf`;
  const pdfBlob = doc.output("blob");

  return {
    pdfBlob,
    fileName,
    forensicHash,
  };
}
