'use strict';

let fs = require('fs-ext');
let path = require('path');
let readDir = require('readdir');

const IN_DIR = 'data';
const OUT_DIR = 'images';
const SKIP = 28 + 8 + 512;
const SEEK_CUR = 1;

function createDirectory(path) {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.error(`Failed to create ${path}`);
      throw e;
    }
  }
}

function extract(inDir, outDir) {
  let exist = fs.existsSync(inDir);
  if (!exist) {
    console.error(`${inDir} directory doesn't exist`);
    return;
  }
  createDirectory(outDir);

  // Read all sets
  let objectNames = readDir.readSync(inDir, ['set*/'],
      readDir.INCLUDE_DIRECTORIES + readDir.CASE_SORT);
  for (let j = 0; j < objectNames.length; j++) {
    let objectPath = path.join(outDir, objectNames[j]);
    createDirectory(objectPath);

    let seqImagesPath = path.join(inDir, objectNames[j]);
    let files = readDir.readSync(seqImagesPath, ['**.seq'],
        readDir.CASE_SORT);

    // Read all sequence files
    for (let i = 0; i < files.length; i++) {
      let seqName = path.join(objectPath, files[i]);
      console.log(`extracting ${path.join(seqImagesPath, files[i])} ...`);
      createDirectory(seqName);

      let fd = fs.openSync(path.join(seqImagesPath, files[i]), 'r');

      try {
        fs.seekSync(fd, SKIP, SEEK_CUR);

        // Parse header
        let header = new Buffer(9 * 4);
        let bytesRead = fs.readSync(fd, header, 0, 9 * 4, null);
        let imageFormat = header.readUInt32LE(20);
        let numFrames = header.readUInt32LE(24);
        console.log('width ', header.readUInt32LE(0));
        console.log('height ', header.readUInt32LE(4));
        console.log('imageBitDepth ', header.readUInt32LE(8));
        console.log('imageBitDepthReal ', header.readUInt32LE(12));
        console.log('imageSizeBytes ', header.readUInt32LE(16));
        console.log('imageFormat ', imageFormat);
        console.log('numFrames ', numFrames);
        console.log('trueImageSize ', header.readUInt32LE(32));

        let fps = new Buffer(8);
        bytesRead = fs.readSync(fd, fps, 0, 8, null);
        console.log('fps ', fps.readDoubleLE());

        let ext;
        switch (imageFormat) {
          case 100:
          case 200:
            ext = 'raw';
            break;
          case 101:
            ext = 'brgb8';
            break;
          case 102:
          case 201:
            ext = 'jpg';
            break;
          case 103:
            ext = 'jbrgb';
            break;
          case 1:
          case 2:
            ext = 'png';
            break;
        }

        // Extract images
        fs.seekSync(fd, 432, SEEK_CUR);
        for (let k = 0; k < numFrames; k++) {
          let sizeBuffer = new Buffer(4);
          bytesRead = fs.readSync(fd, sizeBuffer, 0, 4, null);
          let size = sizeBuffer.readUInt32LE();

          let img = new Buffer(size);
          bytesRead = fs.readSync(fd, img, 0, size, null);

          let imgPath = path.join(seqName, `${k}.${ext}`);
          console.log(`saving ${imgPath}`);

          let fImg = fs.openSync(imgPath, 'w');
          fs.writeSync(fImg, img, 0, size);
          fs.closeSync(fImg);

          fs.seekSync(fd, 12, SEEK_CUR);
        }
      } catch (err) {
        console.error(`Failed to extract ${files[0]} ${err}`);
      }
      finally {
        fs.closeSync(fd);
      }
    }
  }
}

if (require.main === module) {
  let _inDir = IN_DIR;
  let _outDir = OUT_DIR;
  if (process.argv.length === 4) {
    _inDir = process.argv[2];
    _outDir = process.argv[3];
  }
  extract(_inDir, _outDir);
}
