// src/utils/pdfmakeFonts.js

// دالة لجلب الخط وتحويله إلى Base64
async function loadFont(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Base64
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// دالة لإعداد الخطوط (تُستدعى قبل استخدام pdfmake)
export async function setupPdfMake() {
  const fontBase64 = await loadFont('/fonts/Cairo-Regular.ttf');
  const fonts = {
    Cairo: {
      normal: fontBase64,
      bold: fontBase64, // يمكنك استخدام نفس الخط أو تحميل نسخة Bold إذا أردت
      italics: fontBase64,
      bolditalics: fontBase64,
    },
    // يمكن إضافة خطوط أخرى هنا
  };
  return fonts;
}