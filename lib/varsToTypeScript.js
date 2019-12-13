var postcss = require('postcss');
const fs = require('fs');

const customPropertyRegExp = /^--[A-z][\w-]*$/;
const patterns = [
  [/^--spectrum-global-dimension-((?:static-)?size-.*)$/, 'DimensionValue'],
  [/^--spectrum-alias-(?!.*text)(.*-(?:height|width))$/, 'DimensionValue'],
  [/^--spectrum-global-color-(?!.*opacity)(.*)$/, 'ColorValue'],
  [/^--spectrum-semantic-(.*?)-color-default$/, 'ColorValue'],
  [/^--spectrum-semantic-(.*?)-color-border$/, 'BorderColorValue'],
  [/^--spectrum-alias-border-color-(.*)$/, 'BorderColorValue'],
  [/^--spectrum-alias-background-color-(?!.*overlay|quickactions)(.*)$/, 'BackgroundColorValue'],
  [/^--spectrum-alias-border-size-(.*)$/, 'BorderSizeValue'],
  [/^--spectrum-alias-border-radius-(.*)$/, 'BorderRadiusValue']
];

const baseTypes = {
  DimensionValue: ['string', 'number'],
  BorderColorValue: ['ColorValue'],
  BackgroundColorValue: ['ColorValue']
};

// Parse variables from a file with postcss.
function getVars(file) {
  let contents = fs.readFileSync(file, 'utf8');
  let root = postcss.parse(contents);

  let vars = {};
  root.walkRules(rule => {
    rule.walkDecls(decl => {
      if (customPropertyRegExp.test(decl.prop)) {
        vars[decl.prop] = decl.value;
      }
    });
  });

  return vars;
}

let globals = getVars(`${__dirname}/../packages/@adobe/spectrum-css-temp/vars/spectrum-global.css`);
let theme = getVars(`${__dirname}/../packages/@adobe/spectrum-css-temp/vars/spectrum-light.css`);
let scale = getVars(`${__dirname}/../packages/@adobe/spectrum-css-temp/vars/spectrum-medium.css`);

let types = {};
for (let [pattern, type] of patterns) {
  types[type] = [];
}

for (let name in {...theme, ...scale, ...globals}) {
  for (let [pattern, type] of patterns) {
    let m = name.match(pattern);
    if (m) {
      types[type].push(m[1]);
    }
  }
}

types.BorderColorValue.unshift('default'); // DNA just has --spectrum-alias-border-color which doesn't fit the pattern

let ts = '';

for (let type in types) {
  ts += `export type ${type} =\n`;
  for (let v of types[type]) {
    ts += `  | '${v}'\n`;
  }

  if (baseTypes[type]) {
    for (let baseType of baseTypes[type]) {
      ts += `  | ${baseType}\n`;
    }
  }

  ts = ts.trim() + ';\n\n';
}

fs.writeFileSync(`${__dirname}/../packages/@react-spectrum/view/src/dna.ts`, ts.trim() + '\n');