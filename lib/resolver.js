var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');
var globby = require('globby');

var win32 = process.platform === 'win32';

/**
 * @mixin
 * @alias env/resolver
 */
var resolver = module.exports;

resolver.lookups = ['.', 'platers'];
resolver.aliases = [];
resolver.store = {};

/**
 * Search for platers and their sub platers.
 *
 * A plater is a `:lookup/:name/index.html` file placed inside an npm package.
 *
 * Defaults lookups are:
 *   - ./
 *   - platers/
 *
 * So this index file `node_modules/plater-dummy/platers/foo/index.html` would be
 * registered as `dummy:foo` plater.
 *
 * @param {function} cb - Callback called once the lookup is done. Take err as first
 *                        parameter.
 */

resolver.lookup = function () {
    var platersModules = this.findPlatersIn(this.getNpmPaths());
    var patterns = [];

    this.lookups.forEach(function (lookup) {
        platersModules.forEach(function (modulePath) {
            patterns.push(path.join(modulePath, lookup));
        });
    });

    patterns.forEach(function (pattern) {
        globby.sync(['*.html', '*/*.html'], { cwd: pattern }).forEach(function (filename) {
            this.register(path.join(pattern, filename));
        }, this);
    }, this);

};

/**
 * Search npm for every available platers.
 * Platers are npm packages who's name start with `plater-` and who're placed in the
 * top level `node_module` path. They can be installed globally or locally.
 *
 * @param {Array}  List of search paths
 * @return {Array} List of the plater modules path
 */

resolver.findPlatersIn = function (searchPaths) {
    var modules = [];

    searchPaths.forEach(function (root) {
        if (!root) {
            return;
        }

        modules = globby.sync([
            'plater-*',
            '@*/plater-*'
        ], { cwd: root }).map(function (match) {
            return path.join(root, match);
        }).concat(modules);
    });

    return modules;
};

/**
 * Try registering a Plater to this environment.
 * @private
 * @param  {String} platerReference A plater reference, usually a file path.
 */

resolver.register = function (platerReference) {
    var namespace;
    var realPath = fs.realpathSync(platerReference);

    try {
        // debug('found %s, trying to register', platerReference);
        namespace = this.namespace(realPath);

        if (!namespace) {
            throw new Error('Unable to determine namespace.');
        }

        this.store[namespace] = realPath;

    } catch (e) {
        console.error('Unable to register %s (Error: %s)', platerReference, e.message);
    }
};


/**
 * Given a String `filepath`, tries to figure out the relative namespace.
 *
 * ### Examples:
 *
 *     this.namespace('backbone/all/index.js');
 *     // => backbone:all
 *
 *     this.namespace('generator-backbone/model');
 *     // => backbone:model
 *
 *     this.namespace('backbone.js');
 *     // => backbone
 *
 *     this.namespace('generator-mocha/backbone/model/index.js');
 *     // => mocha:backbone:model
 *
 * @param {String} filepath
 */

resolver.namespace = function (filepath) {
    if (!filepath) {
        throw new Error('Missing namespace');
    }

    // cleanup extension and normalize path for differents OS
    var ns = path.normalize(filepath.replace(path.extname(filepath), ''));

    // Sort lookups by length so biggest are removed first
    var lookups = _(this.lookups).map(path.normalize).sortBy('length').value().reverse();

    // if `ns` contain a lookup dir in it's path, remove it.
    ns = lookups.reduce(function (ns, lookup) {
        return ns.replace(lookup, '');
    }, ns);

    var folders = ns.split(path.sep);
    var scope = _.findLast(folders, function (folder) {
        return folder.indexOf('@') === 0;
    });

    // cleanup `ns` from unwanted parts and then normalize slashes to `:`
    ns = ns
        .replace(/(.*plater-)/, '') // remove before `plater-`
        .replace(/[\/\\](index|main)$/, '') // remove `/index` or `/main`
        .replace(/\.+/g, '') // remove `.`
        .replace(/^[\/\\]+/, '') // remove leading `/`
        .replace(/[\/\\]+/g, ':'); // replace slashes by `:`

    if (scope) {
        ns = scope + '/' + ns;
    }

    // debug('Resolve namespaces for %s: %s', filepath, ns);

    return ns;
};


/**
 * Get the npm lookup directories (`node_modules/`)
 * @return {Array} lookup paths
 */
resolver.getNpmPaths = function () {
    var paths = [];

    // Walk up the CWD and add `node_modules/` folder lookup on each level
    process.cwd().split(path.sep).forEach(function (part, i, parts) {
        var lookup = path.join.apply(path, parts.slice(0, i + 1).concat(['node_modules']));

        if (!win32) {
            lookup = '/' + lookup;
        }

        paths.push(lookup);
    });

    // Adding global npm directories
    // We tried using npm to get the global modules path, but it haven't work out
    // because of bugs in the parseable implementation of `ls` command and mostly
    // performance issues. So, we go with our best bet for now.
    if (process.env.NODE_PATH) {
        paths = _.compact(process.env.NODE_PATH.split(path.delimiter)).concat(paths);
    } else {
        // global node_modules should be 5 directory up this one (most of the time)
        paths.push(path.join(__dirname, '../../../..'));

        // adds support for plater resolving when yeoman-plater has been linked
        paths.push(path.join(path.dirname(process.argv[1]), '../..'));

        // Default paths for each system
        if (win32) {
            paths.push(path.join(process.env.APPDATA, 'npm/node_modules'));
        } else {
            paths.push('/usr/lib/node_modules');
        }
    }

    return paths.reverse();
};

/**
 * Get or create an alias.
 *
 * Alias allows the `get()` and `lookup()` methods to search in alternate
 * filepath for a given namespaces. It's used for example to map `plater-*`
 * npm package to their namespace equivalent (without the plater- prefix),
 * or to default a single namespace like `angular` to `angular:app` or
 * `angular:all`.
 *
 * Given a single argument, this method acts as a getter. When both name and
 * value are provided, acts as a setter and registers that new alias.
 *
 * If multiple alias are defined, then the replacement is recursive, replacing
 * each alias in reverse order.
 *
 * An alias can be a single String or a Regular Expression. The finding is done
 * based on .match().
 *
 * @param {String|RegExp} match
 * @param {String} value
 *
 * @example
 *
 *     env.alias(/^([a-zA-Z0-9:\*]+)$/, 'plater-$1');
 *     env.alias(/^([^:]+)$/, '$1:app');
 *     env.alias(/^([^:]+)$/, '$1:all');
 *     env.alias('foo');
 *     // => plater-foo:all
 */

resolver.alias = function alias(match, value) {
    if (match && value) {
        this.aliases.push({
            match: match instanceof RegExp ? match : new RegExp('^' + match + '$'),
            value: value
        });
        return this;
    }

    var aliases = this.aliases.slice(0).reverse();

    return aliases.reduce(function (res, alias) {
        if (!alias.match.test(res)) {
            return res;
        }

        return res.replace(alias.match, alias.value);
    }, match);
};

resolver.getPlaterPath = function(namespace){
    return this.store[namespace];
};

resolver.getPlaterAssetsPath = function (namespace){
    return path.join(path.dirname(this.getPlaterPath(namespace)), 'assets');
};

resolver.lookup();
