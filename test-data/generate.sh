#!/bin/sh
echo "var BENCHMARKS = [" > ../js/benchmarks.js
ls *.js | sed -e "s:^:':" -e "s:$:':" > tmp.txt
paste -s -d "," tmp.txt | sed -e 's/,/,\
/g' >> ../js/benchmarks.js
rm tmp.txt
# :( ls *.js | sed -e "s:^:':g" -e "s:$:':g" -e "1n;s:^:,:g" >> ../js/benchmarks.js
echo "];" >> ../js/benchmarks.js
