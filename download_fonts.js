/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const https = require('https');
const path = require('path');

const fontsDir = path.join(__dirname, 'src/app/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  'Montserrat-Regular.otf',
  'Montserrat-Medium.otf',
  'Montserrat-SemiBold.otf',
  'Montserrat-Bold.otf'
];

const baseUrl = 'https://raw.githubusercontent.com/lun4by/Lunaby/main/src/assets/fonts/';

fonts.forEach(font => {
  const url = baseUrl + font;
  const dest = path.join(fontsDir, font);
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded ' + font);
      });
    } else {
      console.log('Failed to download ' + font + ': ' + res.statusCode);
    }
  }).on('error', (err) => {
    console.error('Error downloading ' + font + ':', err.message);
  });
});
