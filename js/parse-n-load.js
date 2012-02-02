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

var BENCHMARKS = [
        'jquery-1.7.1.js',
        'jquery-1.7.1.min.js',
        'jquery-ui-1.7.2-min.js',
        'scriptaculous-raw.js',
        'scriptaculous-min.js',
        'ymail.js',
        'yui2-raw.js',
        'yui2-min.js',
        'yui3-raw.js',
        'yui3-min.js',
        'github.js'
    ];
//var editingCustomBenchmark = true;

function Pointer(tests, runs) {
    var run = 0;
        benchmark = 0;
    var current = null,
        currentRun = 0;
    
    var advance = function() {
        current = tests[benchmark];
        currentRun = run;
        benchmark++;
        if(benchmark >= tests.length) {
            benchmark = 0;
            run++;
        }
    };
    
    this.getRun = function() { return currentRun; };
    
    this.getPercentage = function() { return Math.ceil((run + benchmark / tests.length) * 100 / runs); };
    
    this.hasNext = function() { return run < runs; };
    
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
            var COLORS = [[255,0,0],[0,255,0],[0,0,255],[255,255,0],[0,255,255],[255,0,255],[192,192,192]];
            var BRIGHTNESS = [1, .7, .4, .7, .4, .7, .4];
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
    script = [];
    runs = 3;
    i = 0;

    icon = '';
    if (match('Safari')) {
        icon = 'safari';
        if (match('Chrome')) {
            icon = 'chrome';
        }
    } else if (match('Firefox')) {
        icon = 'firefox';
    } else if (match('Opera')) {
        icon = 'opera';
    } else if (match('MSIE')) {
        icon = 'ie';
    }
    
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
        if (fn(lst[i])) {
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
    var tot = sum(lst);
    return tot / lst.length;
}

function stdev(lst, mean) {
    var tot = sum(lst);
    mean = mean || avg(lst);
    var squares = map(function(x){return (x-mean)*(x-mean);}, lst);
    return Math.sqrt(sum(squares) / (lst.length-1));
}

function le(lst, lim) {
    return filter(function(a){return a[1]<=lim;}, lst);
}

function nonzero(lst) {
    return filter(function(a){return a[1]>0;}, lst);
}

function nthPercentile(lst, n) {
    var a = lst.slice();
    a.sort(function(x,y){return x[1]-y[1];});
    var lim = a[Math.floor(a.length * n)][1];
    return nonzero(le(lst, lim));
}

function plotData() {
    var results = YAHOO.util.Dom.get('results');
    results.innerHTML = '<tr><td colspan="3">'+navigator.userAgent+'</td></tr>'+
        '<tr><td colspan="3">Is blocking: '+blocking+'</td></tr>'+
        '<tr><th></th><th>Mean Average</th><th>Std. Deviation</th></tr>';
    
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
    
    plotIfAny('parsing', PARSE, PARSE_AS_STRING);
    plotIfAny('evaluation', EVALUATE_PARSED, EVALUATE_PARSED_AS_STRING);
    plotIfAny('whole', SIMPLE, PARSE_AND_EVALUATE, PARSE_AS_STRING_AND_EVALUATE);
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
    
    for(var testcase=0; testcase<data.length; testcase++) {
        if (YAHOO.util.Dom.get('ignore-spikes').checked) {
            data[testcase].data = nthPercentile(data[testcase].data, 0.95);
        }
        var lst = map(function(x){return x[1];}, data[testcase].data);
        var mean = avg(lst).toFixed(2);
        var variance = stdev(lst, mean).toFixed(2);
        results.innerHTML += [
              '<tr><th>',data[testcase].label,'</th>',
              '<td>',mean,' msecs</td>',
              '<td>',variance,' msecs</td></tr>']
            .join('');
    }
    YAHOO.util.Dom.get('flot_'+target).style.height = '150px';
    YAHOO.widget.Flot('flot_'+target, data, { lines:{show:true} });
    var img = YAHOO.util.Dom.get('browser-icon_'+target);
    img.src = 'img/icon-'+icon+'.png';
    img.style.visibility = 'visible';
}

function match(s) {
    return nav.indexOf(s) !== -1;
}

function delel(el) {
    el.parentNode.removeChild(el);
}

function showPercentage(value) {
    if(value) {
        YAHOO.util.Dom.get('run-test').style.display = 'none';
        YAHOO.util.Dom.get('percentage').innerHTML = value+'%';
    } else {
        YAHOO.util.Dom.get('run-test').style.display = '';
        YAHOO.util.Dom.get('percentage').innerHTML = '';
    }
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
        doc.write('<script>setTimeout(function(){top.loadFile();}, 1);</script>');
        doc.close();
    } else {
        showPercentage();
        plotData();
    }
}

function makeCodeVersions(code) {
    function escape(code) {
        return code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/(\r\n|\r|\n)/g, "\\n'+\n'");
    }
    
    var versions = {};
    
    versions[SIMPLE] = code;
    versions[PARSE] = 'function parse() { '+code+' }';
    versions[PARSE_AS_STRING] = "function parse_as_string() { eval('"+escape(code)+"'); }";
    versions[PARSE_AND_EVALUATE] = versions[PARSE] + '; parse();';
    versions[PARSE_AS_STRING_AND_EVALUATE] = versions[PARSE_AS_STRING]+'; parse_as_string();';

    return versions;
}

// browsecap crap.
// blocking = (Safari 4 (but not Chrome nor Android)) or (Opera)
var nav = navigator.userAgent;
var blocking = (match('Safari') && !match('Chrome') && !match('Android') && match('Version/4')) || match('Opera');


function runTest() {
    var applet = YAHOO.util.Dom.get('use-nano').checked && document.getElementById('nanoTime');
    time = applet ?
        (function(ns) {
            return function() {
                try {
                        return ns.nanoTime() / 1e6;
                } catch(e) {
                        ns = new applet.Packages.nano; // reinstantiate
                        return ns.nanoTime() / 1e6;
                }
            };
        })(applet) :
        function() {
            return (new Date()).getTime();
        };
    
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
    if (blocking) {
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
        setTimeout(function(){loadFile();}, 1);
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
    
    YAHOO.util.Dom.get('choose-benchmark').onchange = function() {
        selectBenchmark(this.value);
    }
    
    var  benchmarks_elem = YAHOO.util.Dom.get('choose-benchmark');
    for(var i=0; i<BENCHMARKS.length; i++) {
        var label = document.createElement('label');
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'benchmarks[]';
        checkbox.value = BENCHMARKS[i];
        checkbox.disabled = 'disabled';
        label.appendChild(checkbox);
        var span = document.createElement('span');
        span.innerHTML = '...';
        label.appendChild(span);
        benchmarks_elem.appendChild(label);
        
        parseNLoad.checkboxes[BENCHMARKS[i]] = checkbox;
        
        sendRequest('test-data/'+BENCHMARKS[i], (function(id, checkbox, label) {
            return function(request) {
                parseNLoad.benchmarks[id] = request.responseText;
                checkbox.disabled = false;
                label.innerHTML = id;
            };
        })(BENCHMARKS[i], checkbox, span));
    }
}

function getCheckedBenchmarks() {
    var checked = [];
    for(var i in parseNLoad.checkboxes)
        if(parseNLoad.checkboxes[i].checked)
            checked.push(i);
    return checked;
}

function selectBenchmark(id) {
    /*
    var codeArea = YAHOO.util.Dom.get('js-code');
    if(id == 'custom') {
        if(editingCustomBenchmark)
            return;
        codeArea.disabled = false;
        editingCustomBenchmark = true;
    } else {
        if(editingCustomBenchmark)
            benchmarks['custom'] = codeArea.value;
        codeArea.disabled = 'disabled';
        editingCustomBenchmark = false;
    }
    codeArea.value = benchmarks[id];
    */
}
