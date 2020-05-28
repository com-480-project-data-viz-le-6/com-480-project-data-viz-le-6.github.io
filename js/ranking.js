//Adapted from https://bl.ocks.org/jrzief/70f1f8a5d066a286da3a1e699823470f
function get_suffix() {
    return isMen ? 'wcm' : 'wcf';
}

const categories = ['Downhill', 'Super G', 'Combined', 'Giant Slalom', 'Slalom', 'Parallel'];
const colors = d3.scaleOrdinal(d3.schemeSet3).domain(categories);


function create_ranking(rankingId, dataFile, year, locations) {

    load_new_events(locations);

    $(rankingId).width($(rankingId).parent().width())
    $(rankingId).height($(rankingId).parent().height())

    var width = $(rankingId).width()
    var height = $(rankingId).height()

    // Feel free to change or delete any of the code you see in this editor!
    var svg = d3.select(rankingId).append("svg")
        .attr("width", width)
        .attr("height", height);

    function formatDate(date, display = true) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;
        if (display) {
            return [day, month, year].join('-');
        }
        else {
            return [year, month, day].join('-');
        }

    }


    var tickDuration = 2000;

    var top_n = 12;

    const margin = {
        top: 80,
        right: 0,
        bottom: 5,
        left: 0
    };

    let barPadding = (height - (margin.bottom + margin.top)) / (top_n * 5);

    let title = svg.append('text')
        .attr('class', 'title')
        .attr('y', 24)
        .html('Top 12 skiers in season ' + year);

    let subTitle = svg.append("text")
        .attr("class", "subTitle")
        .attr("y", 55)
        .html("WC points");


    let index = 0;

    function getTextWidth(text) {
        // re-use canvas object for better performance
        return text.length * 12;
    }

    function getName(name, width) {
        if (getTextWidth(name) < width) {
            return name;
        } else if (getTextWidth(name.split(" ").splice(-1)[0]) < width) {
            return name.split(" ").splice(-1)[0];
        } else if (width < 30) {
            return "";
        } else {
            return name.match(/\b\w/g).join('');
        }

    }

    d3.csv(dataFile).then(function (data) {
        data.forEach(d => {
            d.value = +d.value,
                d.lastValue = +d.value,
                d.value = isNaN(d.value) ? 0 : d.value,
                d.date = d.date,
                d.colour = colors(d.specialty)
        });
        
       setup(data[0].date, "data/race_results_" + get_suffix() + ".csv", true);

        var datevalues = d3.nest()
            .key(function (d) { return d.date; })
            .sortKeys(d3.ascending)
            .rollup(function (v) {
                return v.slice().sort((a, b) => b.value - a.value)
                    .slice(0, top_n);
            })
            .entries(data).map(elem => [new Date(elem["key"]), elem["value"]]);

        let yearSlice = datevalues[index][1];
        yearSlice.forEach((d, i) => d.rank = i);

        let x = d3.scaleLinear()
            .domain([0, d3.max(yearSlice, d => d.value)])
            .range([margin.left + 30, width - margin.right - 50]);

        let y = d3.scaleLinear()
            .domain([top_n, 0])
            .range([height - margin.bottom, margin.top]);

        let xAxis = d3.axisTop()
            .scale(x)
            .ticks(width > 500 ? 5 : 2)
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat(d => d3.format(',')(d));


        go_to_point(locations[formatDate(datevalues[index][0], false)]);

        svg.append('g')
            .attr('class', 'axis xAxis')
            .attr('transform', `translate(0, ${margin.top})`)
            .call(xAxis)
            .selectAll('.tick line')
            .classed('origin', d => d == 0);

        svg.selectAll('rect.bar')
            .data(yearSlice, d => d.name)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', x(0) + 1)
            .attr('width', d => x(d.value) - x(0) - 1)
            .attr('y', d => y(d.rank) + 5)
            .attr('height', y(1) - y(0) - barPadding)
            .style('fill', d => d.colour)
            .on('click', d => loadAthlete(d.name, get_current_year()))
            ;

        svg.selectAll('text.label')
            .data(yearSlice)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.value) - 8)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
            .style('text-anchor', 'end')
            .text(d => getName(d.name, x(d.value) - x(0) - 1))
            .on('click', d => loadAthlete(d.name, get_current_year()));

        svg.selectAll('text.valueLabel')
            .data(yearSlice, d => d.name)
            .enter()
            .append('text')
            .attr('class', 'valueLabel')
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
            .text(d => d3.format(',.0f')(d.lastValue));


        svg.selectAll("skier_picture.pp")
            .data(yearSlice)
            .enter()
            .append('svg:image')
            .attr('class', 'pp')
            .attr('xlink:href', d => "https://www.countryflags.io/" + d.ath_country + "/flat/64.png")
            .attr('width', y(1) - y(0) - barPadding - 2)
            .attr('height', y(1) - y(0) - barPadding - 2)
            .attr('x', d => 0)
            .attr('y', d => y(d.rank) + 6);

        let yearText = svg.append('text')
            .attr('class', 'yearText')
            .attr('x', width - margin.right)
            .attr('y', height - 5)
            .style('text-anchor', 'end')
            .html(formatDate(datevalues[index][0], false))
            .style("font-size", `${width / 15}px`)

        let event_name = svg.append('text')
            .attr('class', 'eventName')
            .attr('x', width - margin.right)
            .attr('y', height - (width / 15))
            .style('text-anchor', 'end')
            .html(locations[formatDate(datevalues[index][0], false)][0])
            .style("font-size", `${width / 20}px`)

        function callback(index) {


            yearSlice = datevalues[index][1]
            yearSlice.forEach((d, i) => d.rank = i);

            x.domain([0, d3.max(yearSlice, d => d.value)]);

            svg.select('.xAxis')
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .call(xAxis);

            let bars = svg.selectAll('.bar').data(yearSlice, d => d.name);

            bars
                .enter()
                .append('rect')
                .attr('class', d => `bar ${d.name.replace(/\s/g, '_')}`)
                .attr('x', x(0) + 1)
                .attr('width', d => x(d.value) - x(0) - 1)
                .attr('y', d => y(top_n + 1) + 5)
                .attr('height', y(1) - y(0) - barPadding)
                .on('click', d => loadAthlete(d.name, get_current_year()))
                .style('fill', d => d.colour)
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(d.rank) + 5);

            bars
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('width', d => x(d.value) - x(0) - 1)
                .attr('y', d => y(d.rank) + 5);

            bars
                .exit()
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('width', d => x(d.value) - x(0) - 1)
                .attr('y', d => y(top_n + 1) + 5)
                .remove();

            let labels = svg.selectAll('.label')
                .data(yearSlice, d => d.name);

            labels
                .enter()
                .append('text')
                .attr('class', 'label')
                .attr('x', d => x(d.value) - 8)
                .attr('y', d => y(top_n + 1) + 5 + ((y(1) - y(0)) / 2))
                .on('click', d => loadAthlete(d.name, get_current_year()))
                .style('text-anchor', 'end')
                .text(d => getName(d.name, x(d.value) - x(0) - 1))
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
                ;

            labels
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('x', d => x(d.value) - 8)
                .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
                .text(d => getName(d.name, x(d.value) - x(0) - 1));

            labels
                .exit()
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('x', d => x(d.value) - 8)
                .attr('y', d => y(top_n + 1) + 5)
                .text(d => getName(d.name, x(d.value) - x(0) - 1))
                .remove();

            let pp = svg.selectAll('.pp')
                .data(yearSlice, d => d.name);

            pp
                .enter()
                .append('svg:image')
                .attr('class', 'pp')
                .attr('xlink:href', d => "https://www.countryflags.io/" + d.ath_country + "/flat/64.png")
                .attr('width', y(1) - y(0) - barPadding - 2)
                .attr('height', y(1) - y(0) - barPadding - 2)
                .attr('x', d => 0)
                .attr('y', d => y(top_n + 1) + 6)
                .html(d => d.name)
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(d.rank) + 6);

            pp
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(d.rank) + 6);

            pp
                .exit()
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(top_n + 1) + 6)
                .remove();

            var value = d3
                .sliderBottom()
                .min(d3.min(data))
                .max(d3.max(data))
                .width(300)
                .tickFormat(d3.format('.2%'))
                .ticks(5)
                .step(0.005)
                .default(0.015)
                .on('onchange', val => {
                    d3.select('p#value-step').text(d3.format('.2%')(val));
                });

            let valueLabels = svg.selectAll('.valueLabel').data(yearSlice, d => d.name);

            valueLabels
                .enter()
                .append('text')
                .attr('class', 'valueLabel')
                .attr('x', d => x(d.value) + 5)
                .attr('y', d => y(top_n + 1) + 5)
                .text(d => d3.format(',.0f')(d.lastValue))
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

            valueLabels
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('x', d => x(d.value) + 5)
                .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
                .tween("text", function (d) {
                    let i = d3.interpolateRound(d.lastValue, d.value);
                    return function (t) {
                        this.textContent = d3.format(',')(i(t));
                    };
                });

            valueLabels
                .exit()
                .transition()
                .duration(tickDuration)
                .ease(d3.easeLinear)
                .attr('x', d => x(d.value) + 5)
                .attr('y', d => y(top_n + 1) + 5)
                .remove();

            yearText.html(formatDate(datevalues[index][0], false));
            event_name.html(locations[formatDate(datevalues[index][0], false)][0]);

            go_to_point(locations[formatDate(datevalues[index][0], false)]);
            setup(formatDate(datevalues[index][0], false), "data/race_results_" + get_suffix() + ".csv", true);

            //------NEW SLIDER begin------
            $('#event-slider').ionRangeSlider();
            let event_slider = $("#event-slider").data("ionRangeSlider");
            event_slider.update({from:index+1})
            //------NEW SLIDER end------
        }

//------NEW SLIDER begin------
        $('#event-slider-container').html('<input id="event-slider" type="text" class="js-range-slider" name="event-slider" value="" />')
        $("#event-slider").ionRangeSlider({
            type: "single",
            min: 1,
            max: datevalues.length,
            from: 1,
            grid: true,
            prettify_enabled: false,
            grid_snap: true,
            onFinish: function (data) {
                sliderStep.value(data.from)
            },
            onChange: function (data) {
                callback(data.from - 1);

            }
        });
//------NEW SLIDER end------

        var sliderStep = d3
            .sliderBottom()
            .min(1)
            .max(datevalues.length)
            .width(300)
            .tickFormat(d3.format('d'))
            .ticks(5)
            .step(1)
            .on('onchange', val => {
                callback(val - 1);
            });

            //LEGACY SLIDER
      /*var gStep = d3
            .select('div#slider-step')
            .append('svg')
            .attr('width', 500)
            .attr('height', 100)
            .append('g')
            .attr('transform', 'translate(30,30)');

        gStep.call(sliderStep);*/

        

        var myTimer;
        d3.select("#start").on("click", function () {
            if (sliderStep.value() < datevalues.length) {
                sliderStep.value((sliderStep.value() + 1));
                callback(sliderStep.value() - 1);
            }

            clearInterval(myTimer);
            myTimer = setInterval(function () {
                if (sliderStep.value() >= datevalues.length) {
                    clearInterval(myTimer);
                } else {
                    sliderStep.value((sliderStep.value() + 1));
                }
                callback(sliderStep.value() - 1);
            }, tickDuration + 50);
        });

        d3.select("#stop").on("click", function () {
            clearInterval(myTimer);
        });
    });

    legend({
        color: colors,
        html_id: "#legend_graph",
        title: "Favorite type of event",
        tickSize: 0,
        width: width,
    })
}

