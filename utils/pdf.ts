import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function downloadElementAsPdf(elementId: string, filename: string = "Report") {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID '${elementId}' not found`);
  }

  // Create a canvas helper to convert any unsupported modern color format to standard sRGB
  const helperCanvas = document.createElement("canvas");
  const helperCtx = helperCanvas.getContext("2d");

  const toRgbColor = (colorStr: string): string => {
    if (!helperCtx || !colorStr) return colorStr;
    try {
      helperCtx.fillStyle = colorStr;
      return helperCtx.fillStyle;
    } catch {
      return colorStr;
    }
  };

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (!clonedElement) return;

      const allElements = clonedElement.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.style) return;

        // 1. Sanitize inline styles
        for (let i = 0; i < htmlEl.style.length; i++) {
          const prop = htmlEl.style[i];
          const val = htmlEl.style.getPropertyValue(prop);
          if (val && (val.includes("oklch") || val.includes("color("))) {
            const rgb = toRgbColor(val);
            if (rgb && !rgb.includes("oklch")) {
              htmlEl.style.setProperty(prop, rgb);
            } else {
              htmlEl.style.removeProperty(prop);
            }
          }
        }

        // 2. Sanitize computed colors if they still resolve to oklch
        try {
          const win = clonedDoc.defaultView || window;
          const computed = win.getComputedStyle(htmlEl);
          const colorProps = ["color", "backgroundColor", "borderColor", "outlineColor"] as const;
          for (const prop of colorProps) {
            const val = computed[prop];
            if (val && typeof val === "string" && (val.includes("oklch") || val.includes("color("))) {
              const rgb = toRgbColor(val);
              if (rgb && !rgb.includes("oklch")) {
                htmlEl.style.setProperty(prop, rgb, "important");
              }
            }
          }
        } catch {
          // ignore computed style read errors in sandbox
        }
      });
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
