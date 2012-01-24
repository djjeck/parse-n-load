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

function init() {
    window.data = [[],[],[],[],[]];
    window.jsframe = YAHOO.util.Dom.get('js');
    window.doc = YAHOO.util.Dom.get('js').contentWindow.document;
    window.win = YAHOO.util.Dom.get('js').contentWindow;
    window.script = [];
    window.runs = 3;
    window.i = 0;
    window.runnable = true;

    window.icon = '';
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
    var progress = YAHOO.util.Dom.get('progress');
    progress.innerHTML = '<tr><td colspan="3">'+navigator.userAgent+'</td></tr>'+
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
    var progress = YAHOO.util.Dom.get('progress');
    
    for(var testcase=0; testcase<data.length; testcase++) {
        if (YAHOO.util.Dom.get('ignore-spikes').checked) {
                data[testcase].data = nthPercentile(data[testcase].data, 0.95);
        }
        var lst = map(function(x){return x[1];}, data[testcase].data);
        var mean = avg(lst);
        var variance = stdev(lst, mean);
        progress.innerHTML += [
                              '<tr><th>',data[testcase].label,'</th>',
                              '<td>',mean.toFixed(0),' msecs</td>',
                              '<td>',variance.toFixed(1),' msecs</td></tr>']
                            .join('');
    }
    YAHOO.widget.Flot('flot_'+target, data, { lines:{show:true} });
    var img = YAHOO.util.Dom.get('browser-icon_'+target);
    img.src = 'img/icon-'+icon+'.png';
    img.style.visibility = 'visible';
}

function time() {
    return (new Date()).getTime();
}

function match(s) {
    return nav.indexOf(s) !== -1;
}

function delel(el) {
    el.parentNode.removeChild(el);
}

//for non-blocking browsers. careful not to blow the stack.
function loadFile(i, testcase) {
    if (i<runs) {
        doc.close();
        doc.write('<script>var start = (new Date()).getTime();</script>');
        doc.write('<script id="test">'+script[testcase]+'</script>');
        doc.write('<script>top.data['+testcase+']['+i+'] = ['+i+', (new Date()).getTime() - start];</script>');
        doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
        testcase = (testcase+1)%testcases;
        if(testcase==0) i++;
        doc.write('<script>window.setTimeout(function(){top.loadFile('+i+', '+testcase+');});</script>');
        doc.close();
    } else {
        plotData(data);
    }
}

function makeCodeVersions(code) {
    function escape(code) {
        return code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "'+\n'");
    }
    
    var versions = [];
    
    versions[SIMPLE] = code;
    versions[PARSE] = 'function parse() { '+code+' }';
    versions[PARSE_AS_STRING] = 'function parse_as_string() { eval(\''+escape(code)+'\'); }';
    versions[PARSE_AND_EVALUATE] = versions[PARSE] + ' parse();';
    versions[PARSE_AS_STRING_AND_EVALUATE] = versions[PARSE_AS_STRING]+' parse_as_string();';

    return versions;
}

// browsecap crap.
// blocking = (Safari 4 (but not Chrome)) or (Opera)
var nav = navigator.userAgent;
var blocking = (match('Safari') && !match('Chrome') && match('Version/4')) || match('Opera');


function runInit() {
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
    // hence the window.setTimeout(fn, 0);
    if (blocking) {
        for (var i=0; i<runs; i++) 
            for (var testcase=0; testcase<testcases; testcase++) {
                doc.open();
                var start = time();
                doc.write('<script id="test">'+script[testcase]+'</script>');
                doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
                doc.close();
                data[testcase][i] = [i, (new Date()).getTime() - start];
            }
        plotData(data);
    } else {
        window.setTimeout(function(){loadFile(0,0);}, 0);
    }
}

function stopTest() {
    runnable = false;
}