var assert = require('assert')
var fs = require('fs')
var path = require('path')
var match = require('anymatch')

module.exports = ignore

function ignore(dir, opts) {
    assert.strictEqual(typeof dir, 'string', 'dweb-ignore: directory required')
    opts = Object.assign({
        dwebIgnorePath: path.join(dir, '.dwebignore')
    }, opts)
    dir = path.resolve(dir)

    var allow = ['!**/.well-known/dweb', '!.well-known/dweb']
    var ignoreMatches = opts.ignore // we end up with array of ignores here
        ?
        Array.isArray(opts.ignore) ?
        opts.ignore : [opts.ignore] : []

    var defaultIgnore = [/^(?:\/.*)?\.dat(?:\/.*)?$/, '.DS_Store', '**/.DS_Store'] // ignore .dat (and DS_Store)
    var ignoreHidden = !(opts.ignoreHidden === false) ? [/(^\.|\/\.).*/] : null // ignore hidden files anywhere
    var dwebIgnore = !(opts.useDWebIgnore === false) ? readDWebIgnore() : null

    // Add ignore options
    ignoreMatches = ignoreMatches.concat(defaultIgnore) // always ignore .dat folder
    if (dwebIgnore) ignoreMatches = ignoreMatches.concat(datIgnore) // add .dwebignore
    if (ignoreHidden) ignoreMatches = ignoreMatches.concat(ignoreHidden) // ignore all hidden things
    ignoreMatches = ignoreMatches.concat(allow)

    // https://github.com/Kikobeats/micro-dev/blob/76ce110f0a126452256bc642cb1db4b7b2f14bf2/lib/listening.js#L30-L34
    var ignored = ignoreMatches.reduce(function(acc, ignore) {
        if (typeof ignore !== 'string') {
            // globs
            acc.push(ignore)
            return acc
        }
        var file = path.resolve(dir, ignore)
        if (isDirSync(file)) {
            acc.push(`**/${path.basename(file)}`)
            acc.push(`**/${path.basename(file)}/**`)
        } else {
            acc.push(ignore)
        }
        return acc
    }, [])

    return function(file) {
        file = file.replace(dir, '') // remove dir so we do not ignore anything in that path
        file = file.replace(/^\//, '')
        return match(ignored, file)
    }

    function isDirSync(path) {
        return fs.existsSync(path) && fs.statSync(path).isDirectory()
    }

    function readDWebIgnore() {
        try {
            var ignores = opts.dwebignore || fs.readFileSync(opts.dwebIgnorePath, 'utf8')
            if (ignores && typeof opts.dwebignore !== 'string') ignores = ignores.toString()
            return ignores
                .trim()
                .split(/[\r\n]+/g)
                .filter(function(str) {
                    return !!str.trim()
                })
        } catch (e) {
            return []
        }
    }
}