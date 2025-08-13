#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test the merger with the latest files
const designPath = '/home/pree/phonecaseapp/svg-to-dxf-demo/public/generated/ai-generated-1753825742819.svg';
const outputPath = '/home/pree/phonecaseapp/svg-to-dxf-demo/test-phone-case.svg';

const { mergeDesignWithPhoneCase } = require('./svg-phone-case-merger');

try {
    console.log('Testing SVG merger...');
    mergeDesignWithPhoneCase(designPath, outputPath);
    console.log('Test complete! Check test-phone-case.svg');
} catch (error) {
    console.error('Error:', error);
}