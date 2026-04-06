const text2wav = require('text2wav');

async function generateWav(text, filename) {
  try {
    const buffer = await text2wav(text);
    require('fs').writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
  } catch (error) {
    console.error(`Error generating ${filename}:`, error);
  }
}

(async () => {
  await generateWav('new tab', '../new_tab.wav');
  await generateWav('focus chrome', '../focus_chrome.wav');
})();