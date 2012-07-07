var SIMPLE = 0;
var PARSE = 1;
var PARSE_AS_STRING = 2;
var PARSE_AND_EVALUATE = 3;
var PARSE_AS_STRING_AND_EVALUATE = 4;
var testcases = 1;
var EVALUATE_PARSED = 5;
var EVALUATE_PARSED_AS_STRING = 6;
var extendedTestcases = 7;
var LABELS = ['Simple', 'Parse only', 'Parse as string', 'Parse, then evaluate', 'Parse and call eval()', 'Evaluate parsed', 'Call eval()'];

var DEFAULT_TOLERANCE = 10;

function Pointer(tests, runs) {
  var SERIAL = false;
  var run = 0;
    benchmark = 0;
  var current = null,
    currentRun = 0;

  var advance = function() {
    current = tests[benchmark];
    currentRun = run;
    if(SERIAL) {
      run++;
      if(run >= runs) {
        run = 0;
        benchmark++;
      }
    } else {
      benchmark++;
      if(benchmark >= tests.length) {
        benchmark = 0;
        run++;
      }
    }
  };

  this.getRun = function() { return currentRun; };

  this.getPercentage = function() {
    return SERIAL ?
      Math.ceil((benchmark + run / runs) * 100 / tests.length) :
      Math.ceil((run + benchmark / tests.length) * 100 / runs);
  };

  this.hasNext = function() { return run < runs && benchmark < tests.length; };

  this.next = function() {
    if(!this.hasNext())
      return null;
    advance();
    return current;
  };
  this.current = function() {
    return current;
  }
}

function init() {
  window.parseNLoad = {
    benchmarks: {},
    test: {},
    checkboxes: {},
    makeColor: (function() {
      var COLORS = [[0,255,0],[255,0,0],[0,0,255],[255,0,255],[0,255,255],[255,255,0],[192,192,192]];
      var BRIGHTNESS = [1, .7, .3, .7, .3, .7, .3];
      var colorIndex = 0;
      var colorCache = {};

      return function(script, testcase) {
        colorCache[script] = colorCache[script] || COLORS[colorIndex++%COLORS.length];
        var color = new Array(3);
        for(var i=0;i<3;i++)
          color[i] = Math.floor(colorCache[script][i] * BRIGHTNESS[testcase]);
        return 'rgb('+color.join(',')+')';
      }
    })()
  };
  data = [];
  jsframe = YAHOO.util.Dom.get('js');
  win = jsframe.contentWindow;
  doc = win.document;
  window.onerror = win.onerror = function(error, url, line) {
    alert("Uncaught error:\n"+error+"\n"+url+":"+line);
    return true;
  }
  script = [];
  runs = 3;
  i = 0;

  var match = function(s) {
    return navigator.userAgent.indexOf(s) !== -1;
  }

  // blocking = (Safari 4 (but not Chrome nor Android)) or (Opera)
  window.parseNLoad.blocking = (match('Safari') && !match('Chrome') && !match('Android') && match('Version/4')) || match('Opera');

  window.parseNLoad.icon = (function() {
    if (match('Firefox')) return 'firefox';
    if (match('Android')) return 'android';
    if (match('Chrome')) return 'chrome';
    if (match('Safari')) return 'safari';
    if (match('Opera')) return 'opera';
    if (match('MSIE')) return 'ie';
    return '';
  })();

  YAHOO.util.Dom.get('browser-info').innerHTML = '<h4>'+navigator.userAgent+'</h4><p>'+(window.parseNLoad.blocking ? 'blocking: use a loop' : 'non-blocking: use a callback')+'</p>';

  populateBenchmarks();
}
window.onload = init;

function map(fn, lst) {
  var ret = [];
  for (var i=0; i<lst.length; i++) {
    ret.push(fn(lst[i]));
  }
  return ret;
}

function filter(fn, lst) {
  var ret = [];
  for (var i=0; i<lst.length; i++) {
    if (fn(lst[i], i)) {
      ret.push(lst[i]);
    }
  }
  return ret;
}

function reduce(fn, lst, acc) {
  for (var i=0; i<lst.length; i++) {
    acc = fn(lst[i], acc);
  }
  return acc;
}

function sum(lst) {
  return reduce(function(a,b){return a+b;}, lst, 0);
}

function avg(lst) {
  return sum(lst) / lst.length;
}

function stdev(lst, mean) {
  mean = mean || avg(lst);
  var squares = map(function(x){return (x-mean)*(x-mean);}, lst);
  return Math.sqrt(sum(squares) / (lst.length-1));
}

function plotData() {
  var data = parseNLoad.test;
  for(var script in data) {
    data[script].data = elaborateData(data[script].data);
    for(var testcase=0; testcase<extendedTestcases; testcase++)
      data[script].data[testcase] = {
        color: parseNLoad.makeColor(script, testcase),
        label: script+' '+LABELS[testcase],
        data: data[script].data[testcase]
      };
  }

  var plotIfAny = function(id, var_data) {
    var plot = [];
    for(var i=1;i<arguments.length;i++)
      for(var script in data)
        if(data[script].data[arguments[i]].data instanceof Array)
          plot.push(data[script].data[arguments[i]]);
    if(plot.length > 0)
      flotPlot(plot, id);
  }

  plotIfAny('whole', SIMPLE, PARSE_AND_EVALUATE, PARSE_AS_STRING_AND_EVALUATE);
  plotIfAny('parsing', PARSE, PARSE_AS_STRING);
  plotIfAny('evaluation', EVALUATE_PARSED, EVALUATE_PARSED_AS_STRING);
}

function elaborateData(data) {
  var subtractData = function(minuend, subtrahend) {
    var difference = new Array(minuend.length);
    for(var i=0; i<minuend.length; i++)
      difference[i] = [i, minuend[i][1] - subtrahend[i][1]];
    return difference;
  };

  if(data[PARSE_AND_EVALUATE] instanceof Array && data[PARSE] instanceof Array)
    data[EVALUATE_PARSED] = subtractData(data[PARSE_AND_EVALUATE], data[PARSE]);
  if(data[PARSE_AS_STRING_AND_EVALUATE] instanceof Array && data[PARSE_AS_STRING] instanceof Array)
    data[EVALUATE_PARSED_AS_STRING] = subtractData(data[PARSE_AS_STRING_AND_EVALUATE], data[PARSE_AS_STRING]);
  return data;
}

function flotPlot(data, target) {
  var results = YAHOO.util.Dom.get('results');
  var checkboxes = new Array(data.length);

  var drawGraph = function(checkbox) {
    var filteredData = [];
    for(var i=0; i<data.length; i++)
      if(checkboxes[i].checked)
        filteredData.push(data[i]);

    if(filteredData.length == 0) {
      checkbox.checked = 'checked';
      return;
    }

    var sort = YAHOO.util.Dom.get('sort-data_'+target).checked;
    var sortedData = [];
    if(sort) {
      for(var i=0; i<filteredData.length; i++) {
        sortedData[i] = {
          color: filteredData[i].color,
          label: filteredData[i].label,
          data: map(function(x) { return x.slice(0); }, filteredData[i].data) // deep clone
        };
        sortedData[i].data.sort(function(a,b){ return a[1]-b[1]; });
        for(var j=0; j<sortedData[i].data.length; j++)
          sortedData[i].data[j][0] = j;
      }
    }

    YAHOO.widget.Flot('flot_'+target, sort ? sortedData : filteredData, { lines:{show:true}, legend:{show:false} });
  }

  YAHOO.util.Dom.get('sort-data_'+target).onclick = function() { drawGraph(this); }

  for(var testcase=0; testcase<data.length; testcase++) {
    var tr = document.createElement('tr');

    var rowHeader = document.createElement('th');

    var label = document.createElement('label');

    var color = document.createElement('color');
    color.className = 'color';
    color.style.backgroundColor = data[testcase].color;
    label.appendChild(color);

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = 'checked';
    checkbox.value = testcase;
    checkbox.onchange = function() { drawGraph(this); };
    checkboxes[testcase] = checkbox;
    label.appendChild(checkbox);

    var span = document.createElement('span');
    span.innerHTML = data[testcase].label;
    label.appendChild(span);
    rowHeader.appendChild(label);

    tr.appendChild(rowHeader);

    (function(testcase) {
      var tdMean = document.createElement('td');
      tr.appendChild(tdMean);
      var tdStdDev = document.createElement('td');
      tr.appendChild(tdStdDev);

      var originalData = data[testcase].data;
      var discardSamples = YAHOO.util.Dom.get('detect-gc').checked ? detectSampleDiscard(originalData) : 0;

      var span = document.createElement('span');

      var cleanData = function(discardSamples) {
        data[testcase].data = removeMax(originalData, discardSamples);
        var lst = map(function(x){return x[1];}, data[testcase].data);
        tdMean.innerHTML = avg(lst).toFixed(2)+' msec';
        tdStdDev.innerHTML = stdev(lst).toFixed(2)+' msec';
        span.innerHTML = (originalData.length - data[testcase].data.length);
      }

      var less = document.createElement('button');
      less.className = 'discard-samples';
      less.innerHTML = '-';
      less.onclick = function() {
        discardSamples = Math.max(0, discardSamples-1);
        cleanData(discardSamples);
        drawGraph(less);
      }

      var more = document.createElement('button');
      more.className = 'discard-samples';
      more.innerHTML = '+';
      more.onclick = function() {
        discardSamples = Math.min(originalData.length/2, discardSamples+1);
        cleanData(discardSamples);
        drawGraph(more);
      }

      var td = document.createElement('td');
      td.appendChild(span);
      td.appendChild(more);
      td.appendChild(less);
      tr.appendChild(td);

      cleanData(discardSamples);

    })(testcase);

    results.appendChild(tr);
  }

  YAHOO.util.Dom.get('flot-container_'+target).style.visibility = 'visible';
  var img = YAHOO.util.Dom.get('browser-icon_'+target);
  img.src = 'img/icon-'+window.parseNLoad.icon+'.png';

  drawGraph();
}

function detectSampleDiscard(data) {
  var filtered = removeMax(data);

  if(
      stdev(map(function(x){return x[1];},filtered)) /
      stdev(map(function(x){return x[1];},data)) >
      1-DEFAULT_TOLERANCE/data.length)
    return 0; // no gain
  return detectSampleDiscard(filtered) + 1; // repeat
}

function removeMax(data, repeat) {
  if(typeof repeat == 'undefined')
    repeat = 1;
  while(repeat-->0) {
    var max = reduce(Math.max, map(function(x){return x[1];},data), 0);
    data = filter(function(x){return x[1]<max;}, data);
  }
  return data;
}

function delel(el) {
  el.parentNode.removeChild(el);
}

function showPercentage(value) {
  YAHOO.util.Dom.get('run-test').disabled = value?'disabled':false;
  YAHOO.util.Dom.get('percentage').innerHTML = value?value+'%':'';
}

//for non-blocking browsers. careful not to blow the stack.
function loadFile() {
  if (parseNLoad.pointer.hasNext()) {
    var test = parseNLoad.pointer.next();
    showPercentage(parseNLoad.pointer.getPercentage());
    doc.close();
    var rand = Math.random();
    doc.write('<script>var start = top.time();</script>');
    doc.write('<script id="test">'+test.script+';'+rand+';</script>');
    var i = parseNLoad.pointer.getRun();
    doc.write('<script>top.parseNLoad.pointer.current().data['+i+'] = ['+i+', top.time() - start];</script>');
    doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
    doc.write('<script>setTimeout(function(){top.loadFile();}, 15);</script>');
    doc.close();
  } else {
    showPercentage();
    plotData();
  }
}

function makeCodeVersions(code) {
  function escape(code) {
    return code.
      replace(/\\/g, '\\\\').
      replace(/'/g, "\\'").
      // replace(/(\r\n|\r|\n)/g, "\\n'+\n'"); // inefficient / pretty print
      replace(/(\r\n|\r|\n)/g, '\\n');
  }

  var versions = {};

  versions[SIMPLE] = code;
  versions[PARSE] = 'function parse(){'+code+
    '//*/\n'+ // breaks unclosed multiline comment, or inline comment on last line
    '}';
  versions[PARSE_AS_STRING] = "function parse_as_string(){eval('"+escape(code)+"')}";
  versions[PARSE_AND_EVALUATE] = versions[PARSE] + ';parse.apply(window);';
  versions[PARSE_AS_STRING_AND_EVALUATE] = versions[PARSE_AS_STRING]+';parse_as_string.apply(window);';

  return versions;
}


function runTest() {
  var applet = YAHOO.util.Dom.get('use-nano').checked && document.getElementById('nanoTime');
  time = (applet && applet.Packages && applet.Packages.nano) ?
    (function(ns) {
      return function() {
        try {
          return ns.nanoTime() / 1e6;
        } catch(e) {
          try {
            ns = new applet.Packages.nano; // reinstantiate
            return ns.nanoTime() / 1e6;
          } catch(e) {
            // can this happen, after all this checking?
            return (new Date()).getTime();
          }
        }
      };
    })(applet) :
    function() {
      return (new Date()).getTime();
    };
  YAHOO.util.Dom.get('results').innerHTML = '<tr><th></th><th>Mean Average</th><th>Std. Deviation</th><th>Discarded samples</th></tr>';

  YAHOO.util.Dom.get('flot-container_parsing').style.visibility =
  YAHOO.util.Dom.get('flot-container_evaluation').style.visibility =
  YAHOO.util.Dom.get('flot-container_whole').style.visibility =
    'hidden';

  runs = parseInt(YAHOO.util.Dom.get('num-runs').value||'3');

  var use_simple = YAHOO.util.Dom.get('checkbox_simple').checked;
  var use_parse = YAHOO.util.Dom.get('checkbox_parse').checked;
  var use_eval = YAHOO.util.Dom.get('checkbox_eval').checked;

  var script_ids = getCheckedBenchmarks();
  var benchmarks = [];
  for(var i=0; i<script_ids.length; i++) {
    var script = parseNLoad.test[script_ids[i]] = {
      id: script_ids[i],
      code: makeCodeVersions(parseNLoad.benchmarks[script_ids[i]]),
      data: new Array(testcases)
    }
    var addBenchmark = function(id) {
      script.data[id] = new Array(runs);
      benchmarks.push({ script: script.code[id], data: script.data[id] });
    }

    if(use_simple) {
      addBenchmark(SIMPLE);
    }
    if(use_parse) {
      addBenchmark(PARSE);
      addBenchmark(PARSE_AND_EVALUATE);
    }
    if(use_eval) {
      addBenchmark(PARSE_AS_STRING);
      addBenchmark(PARSE_AS_STRING_AND_EVALUATE);
    }
  }

  parseNLoad.pointer = new Pointer(benchmarks, runs);

  runTestCases();
}


function runTestCases() {
  // Safari 4 blocks when writing script tags. Firefox does not.
  // Chrome does not block, but the naive code path blows the
  // stack after just 20 iterations (ORLY? RLY.)
  // hence the setTimeout(fn, 0);
  if (window.parseNLoad.blocking) {
    while(parseNLoad.pointer.hasNext()) {
      showPercentage(parseNLoad.pointer.getPercentage());
      var test = parseNLoad.pointer.next();
      doc.open();
      var rand = Math.random();
      var start = time();
      doc.write('<script id="test">'+test.script+';'+rand+';</script>');
      doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
      doc.close();
      var i = parseNLoad.pointer.getRun();
      test.data[i] = [i, time() - start];
    }
    showPercentage();
    plotData();
  } else {
    setTimeout(function(){loadFile();}, 15);
  }
}



function populateBenchmarks() {

  // adapted from http://www.quirksmode.org/js/xmlhttp.html
  var XMLHttpFactories = [
      function() { return new XMLHttpRequest() },
      function() { return new ActiveXObject("Msxml2.XMLHTTP") },
      function() { return new ActiveXObject("Msxml3.XMLHTTP") },
      function() { return new ActiveXObject("Microsoft.XMLHTTP") }
  ];
  var createXMLHTTPObject = function() {
    for (var i=0; i<XMLHttpFactories.length; i++) {
      try { return XMLHttpFactories[i](); }
      catch(e) { continue; }
    }
    return false;
  }
  var sendRequest = function(url, callback) {
    var req = createXMLHTTPObject();
    if (!req)
      return;
    req.open('GET',url,true);
    req.setRequestHeader('User-Agent','XMLHTTP/1.0');
    req.onreadystatechange = function() {
      if (req.readyState == 4)
        if (req.status == 200 || req.status == 304)
          callback(req);
    };
    if (req.readyState == 4)
      return;
    req.send();
  }
  // end http://www.quirksmode.org/js/xmlhttp.html
  var formatFileSize = function(bytes) {
    var UNITS = ['b', 'Kb', 'Mb', 'Gb'];
    var unit = 0;
    while(bytes > 1024) {
      bytes /= 1024;
      unit++;
    }
    return bytes.toFixed(2)+UNITS[unit];
  }

  var  benchmarks_elem = YAHOO.util.Dom.get('choose-benchmark');
  for(var i=0; i<BENCHMARKS.length; i++) {
    var span = document.createElement('span');
    span.innerHTML = BENCHMARKS[i];

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = BENCHMARKS[i];

    var label = document.createElement('label');
    label.appendChild(checkbox);
    label.appendChild(span);
    benchmarks_elem.appendChild(label);

    checkbox.onclick =  (function(id, span, checkbox) {
      return function() {
        checkbox.onclick = function() {}; // only first time
        checkbox.disabled = 'disabled';
        checkbox.checked = false;
        span.innerHTML = id+'...';

        sendRequest('test-data/'+id, function(request) {
            parseNLoad.benchmarks[id] = request.responseText;
            parseNLoad.checkboxes[id] = checkbox;

            span.innerHTML = id+' ('+formatFileSize(parseNLoad.benchmarks[id].length)+')';
            checkbox.disabled = false;
            checkbox.checked = 'checked';
          });
        };
    })(BENCHMARKS[i], span, checkbox);
  }
}

function getCheckedBenchmarks() {
  var checked = [];
  for(var i in parseNLoad.checkboxes)
    if(parseNLoad.checkboxes[i].checked)
      checked.push(i);
  return checked.sort();
}