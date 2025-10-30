const Jimp = require('jimp');

async function check(imagePath) {
    const image = await Jimp.read(imagePath);
    let transparent = 0;
    let opaque = 0;
    const total = image.bitmap.width * image.bitmap.height;

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
        const alpha = image.bitmap.data[idx + 3];
        if (alpha === 0) transparent++;
        else if (alpha === 255) opaque++;
    });

    console.log(`\nImage: ${imagePath}`);
    console.log(`Transparent: ${transparent} (${(transparent/total*100).toFixed(1)}%)`);
    console.log(`Opaque: ${opaque} (${(opaque/total*100).toFixed(1)}%)`);
}

check('output_test/Sora_1761828512249.png');
