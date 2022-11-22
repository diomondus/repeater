mkdir -p build
npm install electron-packager --save-dev
electron-packager ./ --platform=darwin --arch=x64 --overwrite --out=./build