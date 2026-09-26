function getAllDocumentStyles(): string {
  let cssText = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || (sheet as any).rules;
        if (rules) {
          for (const rule of Array.from(rules)) {
            cssText += rule.cssText + "\n";
          }
        }
      } catch {
        // Cross-origin stylesheet access restriction - fallback via link tags handled separately
      }
    }
  } catch {
    // Ignore
  }
  return cssText;
}

export function printElementById(elementId: string, docTitle: string = "Receipt") {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.error(`Element with id '${elementId}' not found for printing.`);
    window.print();
    return;
  }

  const inlineCss = getAllDocumentStyles();
  const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
    .map((el) => el.outerHTML)
    .join("\n");

  let iframe = document.getElementById("invensight-print-frame") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "invensight-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1024px";
    iframe.style.height = "1024px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${docTitle}</title>
        ${linkTags}
        <style>
          ${inlineCss}
        </style>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 14mm 10mm;
            @bottom-left {
              content: "JONBRIX INVENTORY MANAGEMENT SYSTEM";
              font-size: 7.5pt;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
            }
            @bottom-center {
              content: "CONFIDENTIAL FOR ADMINISTRATIVE USE ONLY";
              font-size: 7.5pt;
              font-weight: 800;
              color: #111827;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 7.5pt;
              font-weight: 700;
              color: #4b5563;
            }
          }
          body {
            counter-reset: page;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          .print\\:hidden, button, .report-viewer-controls, .no-print {
            display: none !important;
          }
          .grid {
            display: grid !important;
          }
          .flex {
            display: flex !important;
          }
          .hidden {
            display: none !important;
          }
          .report-header-banner {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 16px !important;
          }
          /* Prevent cards, tables, summaries, and blocks from splitting in half across pages */
          .grid > div,
          .bg-card,
          .rounded-xl,
          .rounded-lg,
          .signature-block,
          .page-break-avoid,
          .print-card,
          section,
          article {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .report-running-footer {
            display: none !important;
          }
          .report-print-layout-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          .report-print-tfoot {
            display: table-footer-group !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body class="bg-white text-gray-900 font-sans p-0 m-0">
        <div class="w-full">
          ${sourceEl.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = async () => {
    try {
      if (doc.fonts?.ready) {
        await doc.fonts.ready.catch(() => {});
      }

      const images = Array.from(doc.images || []);
      if (images.length > 0) {
        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) resolve();
                else {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                }
              })
          )
        );
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.error("Print invocation error:", e);
            window.print();
          }
        }, 150);
      });
    } catch {
      window.print();
    }
  };

  triggerPrint();
}

export function printHtmlContent(htmlContent: string, docTitle: string = "Shift Audit") {
  const inlineCss = getAllDocumentStyles();
  const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
    .map((el) => el.outerHTML)
    .join("\n");

  let iframe = document.getElementById("invensight-print-frame") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "invensight-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1024px";
    iframe.style.height = "1024px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${docTitle}</title>
        ${linkTags}
        <style>
          ${inlineCss}
        </style>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
        </style>
      </head>
      <body class="bg-white text-gray-900 font-sans p-4">
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print invocation error:", e);
      window.print();
    }
  }, 200);
}
