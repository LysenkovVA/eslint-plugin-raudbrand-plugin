"use strict";

const path = require("path");
const {isPathRelative} = require("../helpers");

module.exports = {
  meta: {
    type: null, // `problem`, `suggestion`, or `layout`
    docs: {
      description: "feature sliced relative path checker",
      recommended: false,
      url: null, // URL to the documentation page for this rule
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [
      {
        type: 'object',
        properties: {
          alias: {
            type: "string"
          }
        }
      }
    ],
  },

  create(context) {
    const alias = context.options[0]?.alias || "";

    return {
       ImportDeclaration(node) {
         const value = node.source.value;

         // example app/entities/Article
         const importTo = alias ? value.replace(`${alias}/`, "") : value;

         // Полный путь на компе к файлу, в котором мы сейчас находимся
         const fromFilename = context.getFilename();

         if (shouldBeRelative(fromFilename, importTo)) {
           context.report({
             node,
             messageId: "В рамках одного слайса все пути должны быть относительными",
             fix: (fixer) => {
               const normalizedPath = getNormalizedCurrentFilePath(fromFilename)
                   .split("/")
                   .slice(0, -1)
                   .join("/");

               let relativePath = getNormalizedCurrentFilePath(path.relative(normalizedPath, `/${importTo}`));

               if (!relativePath.startsWith(".")) {
                  relativePath = `./${relativePath}`;
               }

               return fixer.replaceText(node.source, `"${relativePath}"`)
             }
           });
         }
       }
    };
  },
};

const layers = {
  "entities": "entities",
  "features": "features",
  "shared": "shared",
  "pages": "pages",
  "widgets": "widgets",
};

function getNormalizedCurrentFilePath(currentFilePath) {
  const fromNormalizedPath = path.toNamespacedPath(currentFilePath);
  const isWindowsOS = fromNormalizedPath.includes('\\');
  const fromPath = fromNormalizedPath.split('src')[1];
  return fromPath.split(isWindowsOS ? '\\' : '/').join("/"); // [ '', 'entities', 'Article' ]
}

function shouldBeRelative(from, to) {
  if (isPathRelative(to)) {
    return false;
  }

  const toArray = to.split("/");
  const toLayer = toArray[0];
  const toSlice = toArray[1];

  if (!toLayer || !toSlice || !layers[toLayer]) {
    return false;
  }


  const fromArray = getNormalizedCurrentFilePath(from).split("/");
  const fromLayer = fromArray[1]; // entities
  const fromSlice = fromArray[2]; // Article

  if (!fromLayer || !fromSlice || !layers[fromLayer]) {
    return false;
  }

  return fromSlice === toSlice && toLayer === fromLayer;
}
