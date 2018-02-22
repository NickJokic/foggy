window.$ = window.jQuery = require('jquery');
var toastr = require('toastr');
const ipc = require('electron').ipcRenderer
var refresherInterval;
var connectionCheck;

window.ononline = function () {
    $("#statusDot").removeClass('statusOffline');
    $("#statusDescription").html("online");
}
window.onoffline = function () {
    $("#statusDot").addClass('statusOffline');
    $("#statusDescription").html("offline");
}

$(document).ready(function () {
    theAppHelper.checkConnection();
});


/* Main app state helper */
var theAppHelper = (function () {

    function initApp() {

        // toastr options
        toastr.options.positionClass = 'toast-bottom-center';
        toastr.options.timeOut = 1200;
        toastr.options.fadeOut = 250;
        toastr.options.fadeIn = 250;
        toastr.options.closeDuration = 300;
        toastr.options.showDuration = 300;
        toastr.options.preventDuplicates = true;
        toastr.options.progressBar = true;

        //DOM calls
        theDomManipulator.fadeInIntro(1300);
        theDomManipulator.initOverlay();
        theDomManipulator.changeMetrics();
        theDomManipulator.exitApp();

        //weather API calls
        theWeatherApiCaller.getLocationBasedWeather();
        theWeatherApiCaller.locationWeatherCaller();
        theWeatherApiCaller.cityWeatherCaller();
        theWeatherApiCaller.refreshWeatherCaller();
    }

    function checkConnectionStatus() {
        return navigator.onLine ? true : false;
    }

    function checkConnection() {
        if (checkConnectionStatus()) {
            initApp();
            $("#statusDot").removeClass('statusOffline');
            $("#statusDescription").html("online");

        } else {
            connectionCheck = setInterval(function () {
                if (navigator.onLine) {
                    initApp();
                    $("#statusDot").removeClass('statusOffline');
                    $("#statusDescription").html("online");
                    clearInterval(connectionCheck)
                } else {
                    $("#statusDot").addClass('statusOffline');
                    $("#statusDescription").html("offline");

                }
            }, 1000);
        }
    }

    return {
        checkConnection: checkConnection,
        checkConnectionStatus: checkConnectionStatus
    }
})();

/*
DOM modifier module
*/

var theDomManipulator = (function () {
    var fahrOption = $("#fahrenheit");
    var celsOption = $("#celsius");
    var overlay = $(".fullscreen-overlay");

    function cToF(val) {
        return Math.round(val * 1.8 + 32);
    }

    function fToC(val) {
        return Math.round((val - 32) / 1.8);
    }

    function mphToKph(val) {
        return (val * 1.609344).toFixed(1);
    }

    function kphToMph(val) {
        return (val / 1.609344).toFixed(1);
    }

    function fadeInIntro(val) {
        $(".main-content").fadeIn(val);
    }

    function exitApp() {
        $("#exitTray").click(function () {
            ipc.send('hideApp', 'hide');
        });
    }

    function searchOverlayInit() {
        $(".searchToggle").click(function () {
            if (!overlay.hasClass("active")) {
                overlay.fadeIn(500);
                $(".mainWidget").fadeOut(20);

                $("#searchIcon").fadeOut(200);
                setTimeout(function () {
                    $("#exitSearchIcon").fadeIn(100);
                }, 300);
                $("#searchInput").val("");
                $("#searchInput").focus();
            } else {
                overlay.fadeOut(500);
                $(".mainWidget").fadeIn(20);
                $("#exitSearchIcon").fadeOut(200);
                setTimeout(function () {
                    $("#searchIcon").fadeIn(100);
                }, 300);
            }
            overlay.toggleClass("active");
        });

        $("#searchButton").click(function () {
            if ($("#searchInput").val() != "") {
                overlay.fadeOut(500);
                $(".mainWidget").fadeIn(20);
                $("#exitSearchIcon").fadeOut(200);
                setTimeout(function () {
                    $("#searchIcon").fadeIn(100);
                }, 300);
                overlay.toggleClass("active");
            }
        });

        $("#searchInput").keyup(function (event) {
            if (event.keyCode == 13) {
                $("#searchButton").click();
            } else if (event.keyCode == 27) {
                overlay.fadeOut(500);
                $(".mainWidget").fadeIn(20);
                $("#exitSearchIcon").fadeOut(200);
                setTimeout(function () {
                    $("#searchIcon").fadeIn(100);
                }, 300);
                overlay.toggleClass("active");
            }
        });
    }

    function changeMetrics() {
        var currTemp = $("#currTemp");
        var currWindSpeed = $("#currWindSpeed");
        var showingTempUnit = $("#tempUnit");
        var showingSpeedUnit = $("#speedUnit");

        fahrOption.click(function () {
            if (!fahrOption.hasClass("activeUnit")) {
                celsOption.removeClass("activeUnit");
                fahrOption.addClass("activeUnit");

                var convertedTemp = cToF(currTemp.text());
                var convertedSpeed = kphToMph(currWindSpeed.text());

                currTemp.fadeOut(250, function () {
                    currTemp.html(convertedTemp);
                    currTemp.fadeIn(250);
                });

                showingTempUnit.fadeOut(250, function () {
                    showingTempUnit.html(" °F");
                    showingTempUnit.fadeIn(250);
                });

                currWindSpeed.fadeOut(250, function () {
                    currWindSpeed.html(convertedSpeed);
                    currWindSpeed.fadeIn(250);
                });

                showingSpeedUnit.fadeOut(250, function () {
                    showingSpeedUnit.html(" mph");
                    showingSpeedUnit.fadeIn(250);
                });
            }
        });

        celsOption.click(function () {
            if (!celsOption.hasClass("activeUnit")) {
                fahrOption.removeClass("activeUnit");
                celsOption.addClass("activeUnit");
                var convertedTemp = fToC(currTemp.text());
                var convertedSpeed = mphToKph(currWindSpeed.text());

                currTemp.fadeOut(250, function () {
                    currTemp.html(convertedTemp);
                    currTemp.fadeIn(250);
                });

                showingTempUnit.fadeOut(250, function () {
                    showingTempUnit.html(" °C");
                    showingTempUnit.fadeIn(250);

                });

                currWindSpeed.fadeOut(250, function () {
                    currWindSpeed.html(convertedSpeed);
                    currWindSpeed.fadeIn(250);
                });

                showingSpeedUnit.fadeOut(250, function () {
                    showingSpeedUnit.html(" kph");
                    showingSpeedUnit.fadeIn(250);
                });
            }
        });
    }

    return {
        fadeInIntro: fadeInIntro,
        initOverlay: searchOverlayInit,
        changeMetrics: changeMetrics,
        exitApp: exitApp
    };

})();


/*
Weather Api module
*/

var theWeatherApiCaller = (function () {

    /* In a real scenario, it should be stored on server side */
    var owmApiKey = "8b6cb54eba063d8463612bf8cf994c25";

    var locationUrl = "http://ip-api.com/json";
    var city, country, temp, pressure, windDir, windSpeed, weatherCode, description;

    function getLocationBasedWeather() {
        $.getJSON(locationUrl, function (data) {
            city = data.city;
            var cityName = data.name;
            if (cityName !== undefined) {
                city = cityName;
            }

            var indexBracket = city.indexOf('(');
            if (indexBracket != -1) {
                city = city.substring(0, indexBracket);
            }

            getCityWeather();
        }).fail(function () {
            toastr.warning("Unable to receive location data. Try to search weather by city.");
        });
    }

    function getCityWeather() {
        var owmApiUrl = "http://api.openweathermap.org/data/2.5/weather?q=";

        if (city == "") {
            toastr.warning("Please select a city!");
        } else {
            $.getJSON(owmApiUrl + city + "&appid=" + owmApiKey + "&units=metric", function (data) {
                city = data.city;
                var cityName = data.name;
                if (cityName !== undefined) {
                    city = cityName;
                }

                var indexBracket = city.indexOf('(');
                if (indexBracket != -1) {
                    city = city.substring(0, indexBracket);
                }

                country = data.sys.country;
                temp = data.main.temp.toFixed(0);
                pressure = data.main.pressure.toFixed(1);


                if (data.wind.deg) {
                    windDir = data.wind.deg.toFixed(1);
                } else {
                    windDir = '/';
                }

                if (data.wind.speed) {
                    windSpeed = data.wind.speed.toFixed(1);
                } else {
                    windSpeed = '/';
                }

                weatherCode = data.weather[0].id;
                description = data.weather[0].description;
                domifyContent(city, country, temp, pressure, windDir, windSpeed, weatherCode, description);
            }).done(function () {
                toastr.info("Weather information refreshed.")
                clearInterval(refresherInterval);
                refresherInterval = setInterval(getCityWeather, 600000);
            }).fail(function () {
                toastr.error("City not found.");
                clearInterval(refresherInterval);
            });
        }
    }

    function domifyContent(ci, co, t, p, wd, ws, wc, d) {

        // check if user entered a city name + country and extract only city

        if (ci.indexOf(',') > 0) {
            ci = ci.substring(0, ci.indexOf(','));
        }

        $("#cityCountry").html(ci + ", " + co);
        $("#currTemp").html(t);
        $("#currPress").html(p);
        $("#currWindDir").html(wd);
        $("#currWindSpeed").html(ws);
        $("#windDirIcon").removeClass();
        $("#weatherIcon").removeClass();
        $("#windDirHeading").html("wind direction")
        $("#windDirIcon").addClass("wi wi-wind towards-" + Math.round(wd) + "-deg");
        $("#weatherIcon").addClass("wi wi-owm-" + wc + " animated infinite pulse");
        $("#weatherDescription").html(d);
        $("#fahrenheit").removeClass("activeUnit");
        $("#celsius").addClass("activeUnit");
        $("#tempUnit").html(" °C");
        $("#speedUnit").html(" kph");
    }

    function cityWeatherCaller() {
        $("#searchButton").click(function () {
            if (theAppHelper.checkConnectionStatus()) {
                city = $("#searchInput").val();
                getCityWeather();
            } else {
                toastr.error("Internet connection not working!")
            }
        });
    }

    function locationWeatherCaller() {
        $("#myLocation").click(function () {
            if (theAppHelper.checkConnectionStatus())
                getLocationBasedWeather();
            else
                toastr.error("Internet connection not working!")
        });
    }

    function refreshWeatherCaller() {
        $("#refreshWeather").click(function () {
            if (theAppHelper.checkConnectionStatus())
                getCityWeather();
            else
                toastr.error("Internet connection not working!")
        });
    }

    return {
        getLocationBasedWeather: getLocationBasedWeather,
        locationWeatherCaller: locationWeatherCaller,
        cityWeatherCaller: cityWeatherCaller,
        getCityWeather: getCityWeather,
        refreshWeatherCaller: refreshWeatherCaller
    };

})();
