var $ = require('cheerio');

function getMenu($content) {
    var root = {items: [], id: '', level: 0};
    var cache = [root];

    function mkdirp(level) {
        cache.length = level + 1;
        var obj = cache[level];
        if (!obj) {
            var parent = (level > 1) ? mkdirp(level - 1) : root;
            obj = { items: [], level: level };
            cache = cache.concat([obj, obj]);
            parent.items.push(obj);
        }
        return obj;
    }

    $content.find('h1, h2, h3').each(function () {
        var $el = $(this);
        var level = +((this.nodeName||this.name).substr(1));

        var parent = mkdirp(level - 1);

        var obj = { section: $el.text(), items: [], level: level, id: $el.attr('id') };
        parent.items.push(obj);
        cache[level] = obj;
    });

    return root;
};

module.exports = function ($content) {
    var menu = getMenu($content);
    var $el = $("<ul>");

    function process(node, $parent) {

        var $li = $('<li>');

        $parent.append($li);

        if (node.section) {
            var $a = $('<a>')
                .html(node.section)
                .attr('href', '#' + node.id);

            if(node.level === 1){
                $a.attr('id', 'root-level')
            }

            $li.append($a);
        }

        if (node.items.length > 0) {
            var $ul = $('<ul>')
                .addClass('nav');

            $li.append($ul);

            node.items.forEach(function (item) {
                process(item, $ul);
            });
        }
    }

    process(menu, $el);

    var $menu = $el.find('#root-level').next();

    return $('<div>').append($menu).html();
};
