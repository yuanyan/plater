var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var generator = require('./generator');

module.exports = function (workspace, options){
    var readmePath = path.join(workspace, 'README.md');
    var navPath = path.join(workspace, 'NAV.md');
    options = options || {};
    options.workspace = workspace;
    options.buildTo = options.buildTo || './dist';

    if(!options.boilerplate){
        throw new Error("Boilerplate not defined in platerfile")
    }

    if(!fs.existsSync(readmePath) && !fs.existsSync(navPath)){
        throw new Error("Invalid root path, need NAV.md or README.md at least")
    }

    if (options['updateNotifier'] !== false) {
        var updateNotifier = require('update-notifier');
        var pkg = require('../package.json');
        updateNotifier({pkg: pkg}).notify();
    }

    generator(readmePath, navPath, options);

}