// Monaco Editor language definition for Circom
// Provides syntax highlighting and autocomplete for Circom circuit language

export const circomLanguageDefinition = {
  id: 'circom',
  extensions: ['.circom'],
  aliases: ['Circom', 'circom'],
  mimetypes: ['text/x-circom'],
};

export const circomLanguageConfig = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

export const circomTokensProvider = {
  defaultToken: '',
  tokenPostfix: '.circom',

  keywords: [
    'pragma',
    'circom',
    'include',
    'template',
    'component',
    'signal',
    'input',
    'output',
    'public',
    'private',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'log',
    'assert',
    'main',
  ],

  operators: [
    '=',
    '>',
    '<',
    '!',
    '~',
    '?',
    ':',
    '==',
    '<=',
    '>=',
    '!=',
    '&&',
    '||',
    '++',
    '--',
    '+',
    '-',
    '*',
    '/',
    '&',
    '|',
    '^',
    '%',
    '<<',
    '>>',
    '+=',
    '-=',
    '*=',
    '/=',
    '&=',
    '|=',
    '^=',
    '%=',
    '<==',
    '==>',
    '<--',
    '-->',
  ],

  // Common regular expressions
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  tokenizer: {
    root: [
      // Identifiers and keywords
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        },
      ],
      [/[A-Z][\w\$]*/, 'type.identifier'],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        },
      ],

      // Numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)/, 'number.hex'],
      [/0[oO]?(@octaldigits)/, 'number.octal'],
      [/0[bB](@binarydigits)/, 'number.binary'],
      [/(@digits)/, 'number'],

      // Delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
  },
};

// Autocomplete suggestions for common Circom patterns
export const circomCompletionProvider = {
  provideCompletionItems: () => {
    const suggestions = [
      {
        label: 'template',
        kind: 14, // Keyword
        insertText: 'template ${1:TemplateName}(${2:params}) {\n\t${3}\n}',
        insertTextRules: 4, // InsertAsSnippet
        documentation: 'Define a new circuit template',
      },
      {
        label: 'signal input',
        kind: 14,
        insertText: 'signal input ${1:name};',
        insertTextRules: 4,
        documentation: 'Define an input signal',
      },
      {
        label: 'signal output',
        kind: 14,
        insertText: 'signal output ${1:name};',
        insertTextRules: 4,
        documentation: 'Define an output signal',
      },
      {
        label: 'component',
        kind: 14,
        insertText: 'component ${1:name} = ${2:Template}(${3:params});',
        insertTextRules: 4,
        documentation: 'Instantiate a component',
      },
      {
        label: 'constraint',
        kind: 14,
        insertText: '${1:signal1} === ${2:signal2};',
        insertTextRules: 4,
        documentation: 'Create a constraint equation',
      },
      {
        label: 'for loop',
        kind: 14,
        insertText: 'for (var ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',
        insertTextRules: 4,
        documentation: 'For loop',
      },
      {
        label: 'if statement',
        kind: 14,
        insertText: 'if (${1:condition}) {\n\t${2}\n}',
        insertTextRules: 4,
        documentation: 'If statement',
      },
      {
        label: 'main component',
        kind: 14,
        insertText: 'component main = ${1:Template}(${2:params});',
        insertTextRules: 4,
        documentation: 'Define the main component',
      },
    ];
    return { suggestions };
  },
};

// Register the language with Monaco
export const registerCircomLanguage = (monaco: any) => {
  // Check if already registered to avoid duplicates/errors
  const languages = monaco.languages.getLanguages();
  if (languages.some((lang: any) => lang.id === 'circom')) {
    return;
  }

  // Register language
  monaco.languages.register(circomLanguageDefinition);

  // Set language configuration
  monaco.languages.setLanguageConfiguration('circom', circomLanguageConfig);

  // Set tokens provider for syntax highlighting
  monaco.languages.setMonarchTokensProvider('circom', circomTokensProvider);

  // Register completion provider
  monaco.languages.registerCompletionItemProvider('circom', circomCompletionProvider);
};
