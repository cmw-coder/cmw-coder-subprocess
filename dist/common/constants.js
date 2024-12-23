"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIMILAR_SNIPPETS_MAX_SEARCH_LINES = exports.IGNORE_COMWARE_INTERNAL = exports.IGNORE_COMMON_WORD = exports.IGNORE_RESERVED_KEYWORDS = exports.REGEXP_WORD = exports.NEW_LINE_REGEX = void 0;
exports.NEW_LINE_REGEX = /\r\n|\r|\n/g;
exports.REGEXP_WORD = /[^a-zA-Z0-9]/;
exports.IGNORE_RESERVED_KEYWORDS = new Set([
    'assert',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'def',
    'else',
    'enum',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'match',
    'new',
    'raise',
    'repeat',
    'return',
    'static',
    'struct',
    'super',
    'switch',
    'then',
    'this',
    'TODO',
    'try',
    'var',
    'while',
    'with',
]);
exports.IGNORE_COMMON_WORD = new Set([
    'a',
    'about',
    'above',
    'after',
    'again',
    'all',
    'an',
    'and',
    'any',
    'are',
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'can',
    'did',
    'do',
    'does',
    'doing',
    'don',
    'down',
    'during',
    'each',
    'few',
    'from',
    'further',
    'had',
    'has',
    'have',
    'having',
    'here',
    'how',
    'in',
    'into',
    'is',
    'it',
    'its',
    'just',
    'more',
    'most',
    'no',
    'not',
    'now',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'our',
    'out',
    'over',
    'own',
    's',
    'same',
    'should',
    'so',
    'some',
    'such',
    't',
    'than',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'these',
    'they',
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    'very',
    'was',
    'we',
    'were',
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'will',
    'would',
    'you',
]);
exports.IGNORE_COMWARE_INTERNAL = new Set([
    //* Comware Macros *//
    'DBGASSERT',
    'INLINE',
    'ISSU',
    'NOINLSTATIC',
    'STATIC',
    'STATICASSERT',
    //* Comware Naming Standards *//
    'E', //? Enum
    'S', //? Struct
    'T', //? Typedef
]);
exports.SIMILAR_SNIPPETS_MAX_SEARCH_LINES = 10000;
