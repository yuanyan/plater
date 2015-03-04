var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var _ = require('lodash');
var rework = require('./rework');
var pagenav = require('./pagenav');
var sitenav = require('./sitenav');
var parser = require('./parser');
var render = require('./render');
var resolver = require('./resolver');
var $ = require('cheerio');
var file = require('./file');

module.exports = function (readmePath, navPath, options){
    options = options || {};

    var navContent = fs.readFileSync(navPath, 'utf-8');
    var siteNavData = sitenav(navContent);
    var markdownFiles = [readmePath].concat(siteNavData.markdownFiles);

    var data = {
        site: {},
        page: {}
    };

    data.site = _.merge(_.clone(options), data.site);

    markdownFiles.forEach(function(markdownPath){
        markdownPath = path.resolve(markdownPath);
        console.log('Processing', chalk.magenta(markdownPath));
        // get site nav html
        var siteNavData = sitenav(navContent, markdownPath);
        var siteNavHtml = siteNavData.siteNavHtml;
        data.site.nav = siteNavHtml;
        // get site href
        data.site.href = getSiteHref(readmePath, markdownPath);

        generate(markdownPath, data, options);
    });

    var assetsFrom = resolver.getPlaterAssetsPath(options.boilerplate);
    var assetsTo =  getBuildToAssetsPath(options);
    console.log('Copy assets from %s to %s', chalk.magenta(assetsFrom), chalk.magenta(assetsTo));
    file.copy(assetsFrom, assetsTo);

};

function generate(markdownPath, data, options){
    var markdownContent = fs.readFileSync(markdownPath, 'utf-8');
    var $workspace = parser(markdownContent);
    $workspace = rework($workspace);

    // get page nav html
    var pageNavHtml = pagenav($workspace);
    // get page title
    var $title = $($workspace.find('h1')[0]);
    var title = $title.text();
    // get page description
    var $description = $title.next();
    if($description.is('p')){
        var description = $description.text();
        $description.remove();
    }
    $title.remove();
    // get content html
    var pageContentHtml = $workspace.html();

    var platerPath = resolver.getPlaterPath(options.boilerplate);
    var buildToHtmlPath = getBuildToHtmlPath(markdownPath, options);

    data = _.merge(data, {
        page: {
            title: title,
            description: description,
            nav: pageNavHtml,
            content: pageContentHtml
        },
        site: {
            assets: getRelativeAssetsPath(buildToHtmlPath, options)
        }
    });

    render(
        platerPath,
        buildToHtmlPath,
        data
    );
}

function getBuildToHtmlPath(markdownPath, options){
    var workspacePath = path.resolve(options.workspace);
    markdownPath = path.resolve(markdownPath)
    markdownPath = path.relative(workspacePath, markdownPath);
    var buildTo = options.buildTo;
    var buildToPath = path.resolve(buildTo, markdownPath);
    return buildToPath.replace(/README\.md/i, 'index.html').replace(/\.md/i, '.html')
}

function getRelativeAssetsPath(buildToHtmlPath, options){
    var assetsPath = path.resolve(getBuildToAssetsPath(options));
    return path.relative(path.dirname(buildToHtmlPath), assetsPath);
}

function getBuildToAssetsPath(options){
    return path.resolve(path.join(options.buildTo, 'assets'))
}

function getSiteHref(readmePath, markdownPath){
    markdownPath = path.resolve(markdownPath);
    readmePath = path.resolve(readmePath);
    return path.relative(path.dirname(markdownPath), path.dirname(readmePath));
}
