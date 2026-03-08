console.log('Testing require("electron"):');
const electron = require("electron");
console.log('Type:', typeof electron);
console.log('Value:', electron);
console.log('Has app:', typeof electron !== 'undefined' && electron !== null && typeof electron.app !== 'undefined');
