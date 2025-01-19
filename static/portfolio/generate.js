import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateImageMetadata(directoryPath, portfolioPath) {
    const images = [];
    
    try {
        if (!fs.existsSync(directoryPath)) {
            throw new Error(`Directory does not exist: ${directoryPath}`);
        }

        const files = fs.readdirSync(directoryPath);
        console.log(`Found ${files.length} files in directory`);
        
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
                console.log(`Processing image: ${file}`);
                const fullPath = path.join(directoryPath, file);
                
                try {
                    const metadata = await sharp(fullPath).metadata();
                    
                    if (metadata.width && metadata.height) {
                        images.push({
                            src: `${portfolioPath}/${file}`,
                            width: metadata.width,
                            height: metadata.height
                        });
                        console.log(`Successfully processed ${file}: ${metadata.width}x${metadata.height}`);
                    }
                } catch (imageError) {
                    console.error(`Error processing image ${file}:`, imageError);
                }
            }
        }
        
        // Generate the output with no quotes around property names
        const formattedImages = images.map(img => `  {
    src: "${img.src}",
    width: ${img.width},
    height: ${img.height}
  }`).join(',\n');

        const outputData = `const images = [\n${formattedImages}\n];`;
        const outputPath = path.join(process.cwd(), 'imageMetadata.js');
        fs.writeFileSync(outputPath, outputData);
        console.log(`Written metadata to: ${outputPath}`);
        
        return images;
    } catch (error) {
        console.error('Error in generateImageMetadata:', error);
        return [];
    }
}

// Example usage:
const directoryPath = process.argv[2] || './wildlife';
const portfolioPath = process.argv[3] || '/portfolio/wildlife';

console.log(`Starting image processing...`);
console.log(`Directory path: ${directoryPath}`);
console.log(`Portfolio path: ${portfolioPath}`);

generateImageMetadata(directoryPath, portfolioPath)
    .then(images => {
        console.log(`Successfully generated metadata for ${images.length} images`);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });