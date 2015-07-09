(function(window, document) {
  var sections = [
     'uk-news',
     'football',
     'travel'
   ];

  function append(parent, child) {
    parent.appendChild(child);
    return parent;
  }

  function addClass(element, className) {
    if( 'classList' in element ) {
      element.classList.add(className);
    } else {
      element.className += ' ' + className;
    }
  }

   function EventEmitter() {
     var listeners;

     function on(eventName, listener) {
       listeners = listeners || [];
       listeners[eventName] = listeners[eventName] || [];
       listeners[eventName].push(listener);
     }

     function fire(eventName, args) {
       for(var i = 0; i < listeners[eventName].length; i++) {
         listeners[eventName][i].call(null, args);
       }
     }

     return {
       on: on,
       fire: fire
     }
   }

  /*
   * This closure handles all communication with The Guardian using the Content API
   */
  function Communication(section) {
    var API_KEY = '9wur7sdh84azzazdt3ye54k4';
    var API_ENDPOINT = 'http://content.guardianapis.com/search';

    var comm = {};
    var order = 'newest';
    var fields = ['trailText'];

    // Sample URL: http://content.guardianapis.com/search?api-key=test&show-fields=trailText&order-by=newest&section=travel
    function buildUrl(section, order, fields) {
      return API_ENDPOINT + '?' +
        'api-key=' + encodeURIComponent(API_KEY) +
        '&show-fields=' + encodeURIComponent(fields.join(',')) +
        '&order-by=' + encodeURIComponent(order) +
        '&section=' + encodeURIComponent(section);
    }

    function onSection() {
      var contents = JSON.parse(this.responseText);
      comm.fire('refreshed', contents.response.results);
    }

    function fetch(section, order, fields) {
      var req = new XMLHttpRequest();
      req.onload = onSection;
      req.open('get', buildUrl(section, order, fields));
      req.send();
    }

    function refresh() {
      fetch(section, order, fields);
    }

    function init() {
      fetch(section, order, fields);
    }

    comm.__proto__ = EventEmitter();
    comm.init = init;
    comm.refresh = refresh;

    return comm;
  }

  function Feed(section) {
    var feed = {}
    var feedNode;
    var itemsNode;
    var items;

     function replace(newItemsNode) {
       itemsNode.parentNode.replaceChild(newItemsNode, itemsNode);
     }

    function createItem(item) {
      var listItem = document.createElement('li');
      var anchor = document.createElement('a');
      var title = document.createElement('h2');
      var desc = document.createElement('p');

      append(listItem, anchor);
      append(anchor, title);
      append(anchor, desc);
      addClass(listItem, 'item');
      addClass(title, 'item-title');
      addClass(desc, 'item-desc');
      anchor.href = item.webUrl;
      title.textContent = item.webTitle;
      desc.innerHTML = item.fields.trailText;

      return listItem;
    }

    function refreshItems(newItems) {
      var newItemsNode = itemsNode.cloneNode(false);
      newItems
        .map(createItem)
        .forEach(function(item) {
          newItemsNode.appendChild(item);
        });
      replace(newItemsNode);
    }

    function init() {
      feedNode = document.getElementById(section);
      itemsNode = feedNode.querySelector('.items');
    }

    feed.__proto__ = EventEmitter();
    feed.init = init;
    feed.refresh = refreshItems;

    return feed;
  }

  function Tabber(id) {
    var tabber = {};
    var container;
    var tabpanels;
    var tabtitles;
    var tablist;
    var tabs;
    var activeTab;

    function buildTabs() {
      tablist = document.createElement('ol');
      tablist.setAttribute('role', 'tablist');
      addClass(tablist, 'nude');
      tabs = tabtitles.map(function(tt, index) {
        var id = Math.floor(Math.random() * 1000);

        var tp = tabpanels[index];
        tp.id = tp.id || 'tabpanel-' + id;
        tp.setAttribute('role', 'tabpanel');
        tp.setAttribute('aria-hidden', 'true');

        var tab = document.createElement('li');
        tab.id = 'tab-' + id;
        addClass(tab, 'zone-' + tp.getAttribute('data-zone'))
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', tp.id);
        tab.setAttribute('aria-selected', 'false');
        tab.textContent = tt.textContent;
        tab.__panel = tp;

        tp.setAttribute('aria-labelledby', 'tab-' + id)

        return tab;
      });

      tabs.forEach(function(tab) {
        append(tablist, tab);
      });
    }

    function deactivate(tab) {
      tab.setAttribute('aria-selected', 'false');
      tab.__panel.setAttribute('aria-hidden', 'true');
    }

    function activate(tab) {
      tab.setAttribute('aria-selected', 'true');
      tab.__panel.setAttribute('aria-hidden', 'false');
      activeTab = tab;
    }

    function onClick(event) {
      var tab = event.target;
      deactivate(activeTab);
      activate(tab);
    }

    function addEvents() {
      tablist.addEventListener('click', onClick);
    }

    function init() {
      container = document.getElementById(id);
      tabpanels = container.querySelectorAll('.feed');
      tabtitles = Array.prototype.map.call(tabpanels, function(tp) { return tp.querySelector('.feed-title'); });
      buildTabs();
      addEvents();
      activate(tabs[0]);
      container.insertBefore(tablist, container.firstChild);
    }

    tabber.__proto__ = EventEmitter();
    tabber.init = init;

    return tabber;
  }

  function onReady() {
    // Feature detection
    if( ! ('flex' in document.documentElement.style) ) {
      addClass(document.documentElement, 'no-flexbox');
    }

    var tabber = Tabber('tablist');
    tabber.init();

    sections = sections.map(function(section) {
      return {
        section: section,
        comm: Communication(section),
        feed: Feed(section),
        init: function() {
          this.feed.init();
          this.comm.init();
          this.feed.on('refresh', this.comm.refresh);
          this.comm.on('refreshed', this.feed.refresh);
        }
      }
    }).forEach(function(section) {
      section.init();
    });
  }

  if( document.readyState === 'loading' ) {
    document.addEventListener('onreadystatechange', onReady);
  } else {
    onReady();
  }
}(window, document));
