// Runtime parsePluginsLock and its dependencies, transpiled from src/shared/plugin-api.ts.
// https://github.com/PerkOS-xyz/PerkOS-Runtime/blob/f671272386583f1fb635dcb77c7716645e8be59f/src/shared/plugin-api.ts
const integer = '(?:0|[1-9][0-9]*)';
const identifier = '[0-9A-Za-z-]+';
const prerelease = '(?:' + integer + '|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const version = [integer, integer, integer].join('\\.') +
    '(?:-' + prerelease + '(?:\\.' + prerelease + ')*)?' +
    '(?:\\+' + identifier + '(?:\\.' + identifier + ')*)?';
const exactVersion = new RegExp('^' + version + '$');
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function invalid(path, expected) {
    throw new TypeError('Invalid plugin ' + path + ': expected ' + expected);
}
function object(value, path) {
    if (value === null || typeof value !== 'object')
        invalid(path, 'a plain object');
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
        invalid(path, 'a plain object');
    return value;
}
function string(value, path, allowEmpty = false) {
    if (typeof value !== 'string' || value.includes('\0') || (!allowEmpty && !value.trim())) {
        invalid(path, allowEmpty ? 'a string without NUL characters' : 'a non-empty string without NUL characters');
    }
    return value;
}
function match(value, path, pattern, expected) {
    const entry = string(value, path);
    if (entry.trim() !== entry || !pattern.test(entry))
        invalid(path, expected);
}
export const PLUGIN_CATALOGUE_SOURCE = 'https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins';
/** Read plugins.lock text, where repeated pins would otherwise collapse. */
export function parsePluginsLock(json) {
    const lock = object(JSON.parse(json), 'lock');
    if (lock.source !== PLUGIN_CATALOGUE_SOURCE)
        invalid('lock.source', PLUGIN_CATALOGUE_SOURCE);
    const plugins = object(lock.plugins, 'lock.plugins');
    // JSON.parse checked the syntax. Scan complete strings so escaped keys
    // decode to their actual names and punctuation in values is ignored.
    const scopes = [];
    for (const [token, keySeparator] of json.matchAll(/"(?:[^"\\]|\\[\s\S])*"(\s*:)?|[{}]/g)) {
        if (token === '{')
            scopes.push(new Set());
        else if (token === '}')
            scopes.pop();
        else if (keySeparator) {
            const key = JSON.parse(token.slice(0, -keySeparator.length));
            const keys = scopes.at(-1);
            if (keys.has(key))
                invalid('lock', 'unique keys (repeated key ' + JSON.stringify(key) + ')');
            keys.add(key);
        }
    }
    for (const [id, entry] of Object.entries(plugins)) {
        match(id, 'lock.plugins key', slug, 'a lowercase kebab-case identifier');
        const path = 'lock.plugins.' + id;
        if (typeof entry === 'string') {
            match(entry, path, exactVersion, 'a semantic version (major.minor.patch)');
        }
        else {
            const pin = object(entry, path);
            match(pin.version, path + '.version', exactVersion, 'a semantic version (major.minor.patch)');
            match(pin.sha256, path + '.sha256', /^[a-f0-9]{64}$/, 'a lowercase hexadecimal SHA-256');
        }
    }
    return { source: lock.source, plugins: plugins };
}
