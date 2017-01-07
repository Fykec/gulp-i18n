var through = require('through2')
var gutil = require('gulp-util')
var PluginError = gutil.PluginError
var pkg = require('./package.json')
var path = require('path')
var fs = require('fs');
var glob = require('glob')
var _ = require('lodash')

module.exports = function (options) {
    function getFiles(content, reg, mainPath) {
        var startCondReg = /<!--\[[^\]]+\]>/gim;
        var endCondReg = /<!\[endif\]-->/gim;
        var paths = [];
        var files = [];

        content
            .replace(startCondReg, '')
            .replace(endCondReg, '')
            .replace(/<!--(?:(?:.|\r|\n)*?)-->/gim, '')
            .replace(reg, function (a, quote, b) {
                if (!b.startsWith('http')) {
                    var filePath = path.resolve(path.join(mainPath, b));
                    paths.push(filePath);
                }
            });

        for (var i = 0, l = paths.length; i < l; ++i) {
            var filepaths = glob.sync(paths[i]);
            if (filepaths[0] === undefined) {
                throw new gutil.PluginError(pkg.name, 'Path ' + paths[i] + ' not found!');
            }
            filepaths.forEach(function (filepath) {
                files.push(new gutil.File({
                    path: filepath,
                    contents: fs.readFileSync(filepath)
                }));
            });
        }

        return files;
    }

    function getFileMatched(file, regex) {
        var content = file.contents.toString()
        var results = []
        var match = regex.exec(content)
        while (match) {            
            results.push(match[2])
            match = regex.exec(content)
        }
        return results
    }

    /**
    * Encode html attribute
    * @param {string} input
    * @returns {string} escaped
    */
    function encodeAttr(string) {
        return string.replace(/"/g, '&#34;')
            .replace(/'/g, '&#39;')
    }

    /**
     * Encode bottle template string
     * @param {string} input
     * @returns {string} escaped
     */
    function encodeTemplate(string) {
        if (string.indexOf('\'') >= 0) {
            return ['"', string, '"'].join('')
        } else {
            return ['\'', string, '\''].join('')
        }
    }

    function getI18nMapElements(i18nNames) {
        var i18nTemplate = ''
        i18nNames.forEach(function (name) {            
            var attr = encodeAttr(name)            
            var template = encodeTemplate(name)
            i18nTemplate += ['<input type="hidden" id="i18n-str-', attr, '" value="{{_(', template, ')}}">'].join('') + '\n'
        })

        var jsFile = fs.readFileSync('./i18n.js')
        i18nTemplate += '<script>' + jsFile.toString() + '</script>'

        return i18nTemplate
    }

    var stream = through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            return cb(null, file)
        }

        if (file.isBuffer()) {
            var fileName = path.basename(file.path, '.html')            
            var i18nRegex = /i18n\(('|")(.+?)\1(,|\))/g
            var jsReg = /<\s*script\s+.*?src\s*=\s*("|')([^"']+?)\1.*?><\s*\/\s*script\s*>/gi;

            var i18nMatched = getFileMatched(file, i18nRegex)

            var jsFiles = getFiles(file.contents.toString(), jsReg, path.dirname(file.path))
            if (jsFiles) {
                jsFiles.forEach(function (file, index, array) {
                    var jsMatched = getFileMatched(file, i18nRegex)
                    i18nMatched = _.unionWith(i18nMatched, jsMatched)
                })
            }
            var i18nMap = getI18nMapElements(i18nMatched)            
            //http://stackoverflow.com/questions/9423722/string-replace-weird-behavior-when-using-dollar-sign-as-replacement
            var newContent = file.contents.toString().replace(options.placeholder, function(){return i18nMap})
            file.contents = new Buffer(newContent)            
            return cb(null, file)
        }
        if (file.isStream()) {
            return cb(new PluginError(pkg.name, 'Streaming is not supported'));
        }
    })
    return stream
}
