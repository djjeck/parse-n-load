var SIMPLE = 0;
var PARSE = 1;
var PARSE_AS_STRING = 2;
var PARSE_AND_EVALUATE = 3;
var PARSE_AS_STRING_AND_EVALUATE = 4;
var testcases = 5;
var EVALUATE_PARSED = 5;
var EVALUATE_PARSED_AS_STRING = 6;
var extendedTestcases = 7;
var LABELS = ['Simple', 'Parse only', 'Parse as string', 'Parse, then evaluate', 'Parse and call eval()', 'Evaluate parsed', 'Call eval()'];
var COLORS = ['#DD1111','#11DD11','#1111DD','#11DD11','#1111DD','#11DD11','#1111DD'];

var BENCHMARKS = ['---', 'jquery-1.7.1.js', 'jquery-1.7.1.min.js', '---', 'jquery-1.7.1--partly_pruned.js', 'jquery-1.7.1--completely_pruned.js'];
var benchmarks = {};
var editingCustomBenchmark = true;

function init() {
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

function plotData(data) {
    var results = YAHOO.util.Dom.get('results');
    results.innerHTML = '<tr><td colspan="3">'+navigator.userAgent+'</td></tr>'+
        '<tr><td colspan="3">Is blocking: '+blocking+'</td></tr>'+
        '<tr><th></th><th>Mean Average</th><th>Std. Deviation</th></tr>';
    
    data = elaborateData(data);
    for(var testcase=0; testcase<extendedTestcases; testcase++)
        data[testcase] = {
            color: COLORS[testcase],
            label: LABELS[testcase],
            data: data[testcase]
        };
    flotPlot([data[PARSE], data[PARSE_AS_STRING]], 'parsing');
    flotPlot([data[EVALUATE_PARSED], data[EVALUATE_PARSED_AS_STRING]], 'evaluation');
    flotPlot([data[PARSE_AND_EVALUATE], data[PARSE_AS_STRING_AND_EVALUATE], data[SIMPLE]], 'whole');
}

function elaborateData(data) {
    function subtractData(minuend, subtrahend) {
        var difference = new Array(minuend.length);
        for(var i=0; i<minuend.length; i++)
            difference[i] = [i, minuend[i][1] - subtrahend[i][1]];
        return difference;
    }
    data[EVALUATE_PARSED] = subtractData(data[PARSE_AND_EVALUATE], data[PARSE]);
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

function showPercentage(run, testcase) {
    if(run<runs) {
        YAHOO.util.Dom.get('run-test').style.display = 'none';
        YAHOO.util.Dom.get('percentage').innerHTML = Math.floor(100*(run+(testcase/testcases))/runs)+'%';
    } else {
        YAHOO.util.Dom.get('run-test').style.display = '';
        YAHOO.util.Dom.get('percentage').innerHTML = '';
    }
}

//for non-blocking browsers. careful not to blow the stack.
function loadFile(i, testcase) {
    showPercentage(i, testcase);
    if (i<runs) {
        doc.close();
        doc.write('<script>var start = top.time();</script>');
        doc.write('<script id="test">'+(script[testcase]+';'+i+'+'+testcase)+'</script>');
        doc.write('<script>top.data['+testcase+']['+i+'] = ['+i+', top.time() - start];</script>');
        doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
        testcase = (testcase+1)%testcases;
        if(testcase==0) i++;
        doc.write('<script>setTimeout(function(){top.loadFile('+i+', '+testcase+');});</script>');
        doc.close();
    } else {
        plotData(data);
    }
}

function makeCodeVersions(code) {
    function escape(code) {
        return code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/(\r\n|\r|\n)/g, "\\n'+\n'");
    }
    
    var versions = [];
    
    versions[SIMPLE] = code;
    versions[PARSE] = 'function parse() { '+code+' }';
    versions[PARSE_AS_STRING] = "function parse_as_string() { eval('"+escape(code)+"'); }";
    versions[PARSE_AND_EVALUATE] = versions[PARSE] + '; parse();';
    versions[PARSE_AS_STRING_AND_EVALUATE] = versions[PARSE_AS_STRING]+'; parse_as_string();';

    return versions;
}

// browsecap crap.
// blocking = (Safari 4 (but not Chrome)) or (Opera)
var nav = navigator.userAgent;
var blocking = (match('Safari') && !match('Chrome') && match('Version/4')) || match('Opera');


function runInit() {
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
    data = new Array(testcases);
    for(var i=0;i<testcases; i++)
        data[i] = new Array(runs);
    script = makeCodeVersions(YAHOO.util.Dom.get('js-code').value);
}


function runTest() {
    runInit();

    // Safari 4 blocks when writing script tags. Firefox does not.
    // Chrome does not block, but the naive code path blows the
    // stack after just 20 iterations (ORLY? RLY.)
    // hence the setTimeout(fn, 0);
    if (blocking) {
        for (var i=0; i<runs; i++) 
            for (var testcase=0; testcase<testcases; testcase++) {
                showPercentage(i, testcase);
                doc.open();
                var start = time();
                doc.write('<script id="test">'+(script[testcase]+';'+i+'+'+testcase)+'</script>');
                doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
                doc.close();
                data[testcase][i] = [i, time() - start];
            }
        plotData(data);
    } else {
        setTimeout(function(){loadFile(0,0);}, 0);
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
    
    var select = YAHOO.util.Dom.get('choose-benchmark');
    for(var i=0; i<BENCHMARKS.length; i++) {
        var option = document.createElement('option');
        option.value = option.innerHTML = BENCHMARKS[i];
        option.disabled = 'disabled';
        select.appendChild(option);
        
        sendRequest('test-files/'+BENCHMARKS[i], (function(id, option) {
            return function(request) {
                benchmarks[id] = request.responseText;
                option.disabled = false;
            };
        })(BENCHMARKS[i], option));
    }
}

function selectBenchmark(id) {
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
}