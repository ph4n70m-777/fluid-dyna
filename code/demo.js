'use strict';

/* global variables */

var FPS = 10;


var canvas;
var win_x;
var win_y;

var omx;
var omy;
var mx;
var my;


/*
  ----------------------------------------------------------------------
   free/clear/allocate simulation data
  ----------------------------------------------------------------------
*/

function jitter(){
	return Math.random()*2 - 1;
}

function clear_data (){
	for (var i=0 ; i<size ; i++ ) {
		u[i]
			= v[i]
			= u_prev[i]
			= v_prev[i]
			= dens[i]
			= dens_prev[i]
			= 0.0
			;
	}
}

function allocate_data (){
	size = (N+2)*(N+2);
	
	u			= [];
	v			= [];
	u_prev		= [];
	v_prev		= [];
	dens		= [];
	dens_prev	= [];
	
	clear_data();
}


/**
 * 
 * 
 * https://bocoup.com/weblog/d3js-and-canvas
 */
function draw_velocity ()
{	
	var scale = win_x/N;
	var offset = Math.round(scale/2);
	//var scale = d3.scale.linear()
	//	.range([1, win_x])
	//	.domain(d3.extent(data))
	//	;
	
	
	
	
	var dataBinding = d3
		.select("g.lines")
		.selectAll("line")
		.data(v)
		;
	
	// create the initial lines starting
	// 
	dataBinding.enter()
		.append("line")
		.attr("stroke-width", "1")
		.attr("stroke","red")
		.attr("x1", function(d,i){
				var val = indexCart(i).x;
				val *= scale;
				val += offset;
				return Math.round(val);
			})
		.attr("y1", function(d,i){
				var val = indexCart(i).y;
				val *= scale;
				val += offset;
				return Math.round(val);
			})
		.attr("x2", function(d,i){
				var val = XI(i).x;
				val += u[i];
				val *= scale;
				val += offset;
				val += 1+jitter()
				return Math.round(val);
			})
		.attr("y2", function(d,i){
				var val = XI(i).y;
				val += v[i];
				val *= scale;
				val += offset;
				val += 1 + jitter()
				return Math.round(val);
			})
		;
	
	dataBinding
		.attr("x2", function(d,i){
				var val = XI(i).x;
				val += u[i];
				val *= scale;
				val += offset;
				val += 1+jitter()
				return Math.round(val);
			})
		.attr("y2", function(d,i){
				var val = XI(i).y;
				val += v[i];
				val *= scale;
				val += offset;
				val += 1 + jitter()
				return Math.round(val);
			})
		;
	
	// for exiting items...
	// well that should never happen
	//dataBinding.exit()
	//	.remove()
	//	;
}

function draw_density()
{
	var scale = win_x/N;
	
	var dataBinding = canvas.selectAll("line").data(dens);
		var dataBinding = d3
		.select("g.densities")
		.selectAll("rect")
		.data(dens)
		;
	
	dataBinding
		.attr("fill-opacity",function(d){
			return d;
		});
	
	// for new elements, create a 'custom' dom node, of class rect
	// with the appropriate rect attributes
	dataBinding.enter()
		.append("rect")
		.attr("fill","black")
		.attr("width" ,scale)
		.attr("height",scale)
		.attr("x", function(d,i){
				return scale * XI(i).x;
			})
		.attr("y", function(d,i){
				return scale * XI(i).y;
			})
		;
}

/**
 * relates mouse movements to forces sources
 * 
 * 
 * https://developer.mozilla.org/en/docs/Web/Events/mousemove
 */
function get_from_UI (e){
	var LEFT = 1==(1 & e.buttons);
	var RIGHT = 2==(2 & e.buttons);
	
	if( !LEFT && !RIGHT ) return;
	
	console.debug('Mouse Activity: ' + e.buttons);
	
	mx = e.clientX;
	my = e.clientY;
	omx = omx || mx;
	omy = omy || my;
	
	var i = Math.floor((       mx /(1.0*win_x))*N+1);
	var j = Math.floor(((win_y-my)/(1.0*win_y))*N+1);
	
	if ( i<1 || i>N || j<1 || j>N ) return;
	
	var index = IX(i,j);
	
	if (LEFT) {
		u[index] = force * (mx-omx);
		v[index] = force * (omy-my);
	}
	if (RIGHT) {
		dens[index] = source;
	}
	
	omx = mx;
	omy = my;
}


function reshape_func (){
	console.debug("Window Resized");
	win_x = window.innerWidth;
	win_y = window.innerHeight;
}

function MainLoop(){
	vel_step (u, v, u_prev, v_prev, visc, dt );
	dens_step ( N, dens, dens_prev, u, v, diff, dt );
	
	draw_velocity();
	draw_density();
}

var loop = null;
function Start(){
	if(!loop){
		loop = setInterval(MainLoop, 1000/FPS);
	}
}

function Stop(){
	clearInterval(loop);
	loop = null;
}

function Reset(){
	clear_data();
}

function init(){
	console.log("Logging initialized");
	
	GetFormValues(d3.select("form").node());
	
	allocate_data();
	
	window.onresize = reshape_func;
	reshape_func();
	
	canvas = d3.select("#vis")
		.append("svg")
		.attr("width", win_x)
		.attr("height", win_y)
		;

	d3.select("#vis svg").append("g").attr("class","densities");
	d3.select("#vis svg").append("g").attr("class","lines");
	var node = d3.select("#vis svg").node();
	
	node.addEventListener("mousedown", function() {
		omx = null;
		omy = null;
		var up = function(){
			node.removeEventListener("mousemove",get_from_UI);
			node.removeEventListener("mouseup",up);
		};
		node.addEventListener("mousemove",get_from_UI);
		node.addEventListener("mouseup",up);
	});
	
	Seed();
	draw_velocity();
	draw_density();
}

function GetFormValues(form){
	N = +form.N.value;
	dt = +form.dt.value;
	diff = +form.diff.value;
	visc = +form.visc.value;
	force = +form.force.value;
	source = +form.source.value;
	dvel = (form.dvel.checked === true);
}

function Seed(){
	var smokerLoc = SeedVel();
	SeedDens(smokerLoc);
}

var smokeMachine = null;
function SeedDens(loc){
	if(smokeMachine){
		clearInterval(smokeMachine);
	}
	loc = IX(loc[0],loc[1]);
	smokeMachine = setInterval(function(){
		if(!smokeMachine){
			return;
		}
		dens[loc] = source;
	},1000);
}


function SeedVel(dir,rect){
	rect= rect || {
		x:1,
		y:1,
		width: N,
		height : N,
	};
	dir = (dir || 0) % 4;
	
	if(rect.height-rect.y ===0 || rect.width-rect.x ===0){
		return [rect.x,rect.y];
	}
	
	var right = JSON.parse(JSON.stringify(rect));
	var left = JSON.parse(JSON.stringify(rect));
	
	if(dir%2===0){
		right.x = Math.floor((right.x+right.width)/2)+1;
		left.width = right.x - left.x;
	}
	else{
		right.y = Math.floor((right.y+right.height)/2)+1;
		left.height = right.y - left.y;
	}
	
	if(dir==1 || dir==2){
		var t= right;
		right=left;
		left=t;
	}
	
	for(var x=right.x; x<=right.width;x++){
		for( var y=right.y; y<=right.height; y++){
			var i = IX(x,y);
			u[i] = (dir%2) 
				* (dir<2?1:-1) 
				* right.width
				;
			v[i] = ((dir+1)%2) 
				* (dir<2?1:-1) 
				* right.height
				;
		}
	}
	
	return SeedVel(dir+1,left);
}

