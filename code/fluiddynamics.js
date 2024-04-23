'use strict';


var N;
var size;
var dt, diff, visc;
var force, source;
var dvel;

var u = [];
var v = [];
var u_prev = [];
var v_prev = [];

var dens;
var dens_prev = [];


function FOR_EACH_CELL(func){
	for ( var i=1 ; i<=N ; i++ ) { 
		for ( var j=1 ; j<=N ; j++ ) {
			func(i,j);
		}
	}
}

function IX(i,j){
	if(typeof i === "object"){
		j = i.j;
		i = i.i;
	}
	return (i+j*(N+2));
}

function indexCart(n){
	var width = N+2;
	var rtn = {
		y:Math.floor(n/width),
		x:n%width,
	};
	rtn.j = rtn.x;
	rtn.i = rtn.y;
	return rtn;
}

function XI(n){return indexCart(n);};

function SWAP(x0,x) {
	var tmp=x0;
	x0=x;
	x=tmp;
}

function add_source (/* float * */ x, /*float * */ s, /*float*/ dt )
{
	for ( var i=0 ; i<size ; i++ ){
		x[i] += dt*s[i];
	}
}

function set_bnd ( /*int*/ b, /* float * */ x )
{
	for (var i=1 ; i<=N ; i++ ) {
		x[IX(0  ,i)] = b==1 ? -x[IX(1,i)] : x[IX(1,i)];
		x[IX(N+1,i)] = b==1 ? -x[IX(N,i)] : x[IX(N,i)];
		x[IX(i,0  )] = b==2 ? -x[IX(i,1)] : x[IX(i,1)];
		x[IX(i,N+1)] = b==2 ? -x[IX(i,N)] : x[IX(i,N)];
	}
	x[IX(0  ,0  )] = 0.5*(x[IX(1,0  )]+x[IX(0  ,1)]);
	x[IX(0  ,N+1)] = 0.5*(x[IX(1,N+1)]+x[IX(0  ,N)]);
	x[IX(N+1,0  )] = 0.5*(x[IX(N,0  )]+x[IX(N+1,1)]);
	x[IX(N+1,N+1)] = 0.5*(x[IX(N,N+1)]+x[IX(N+1,N)]);
}

function lin_solve ( /* int */ b, /* float * */ x, /* float * */ x0, /* float */  a, /* float */ c )
{
	for (var k=0 ; k<20 ; k++ ) {
		FOR_EACH_CELL(function(i,j){
			var index = IX(i,j);
			val val = 
				x[IX(i-1,j)]
				+ x[IX(i+1,j)]
				+ x[IX(i,j-1)]
				+ x[IX(i,j+1)]
				;
			val = x0[index] + a*(val);
			val = val / c ;
			x[index] = val;
		});
		set_bnd ( b, x );
	}
}

function diffuse (/* int */ b, /* float * */ x, /* float * */ x0, /* float */ diff, /* float */ dt )
{
	var a=dt*diff*N*N;
	lin_solve ( b, x, x0, a, 1+4*a );
}

function advect ( /* int */ N, /* int */ b, /* float * */ d, /* float * */ d0, /* float * */ u, /* float * */ v, /* float */ dt )
{
	var i0, j0, i1, j1;
	var x, y, s0, t0, s1, t1, dt0;

	dt0 = dt*N;
	FOR_EACH_CELL(function(i,j){
		x = i-dt0*u[IX(i,j)]; y = j-dt0*v[IX(i,j)];
		if (x<0.5) x=0.5; if (x>N+0.5) x=N+0.5; i0=Math.floor(x); i1=i0+1;
		if (y<0.5) y=0.5; if (y>N+0.5) y=N+0.5; j0=Math.floor(y); j1=j0+1;
		s1 = x-i0; s0 = 1-s1; t1 = y-j0; t0 = 1-t1;
		d[IX(i,j)] = s0*(t0*d0[IX(i0,j0)]+t1*d0[IX(i0,j1)])+
					 s1*(t0*d0[IX(i1,j0)]+t1*d0[IX(i1,j1)]);
	});
	set_bnd ( b, d );
}

function project ( /* int */ N, /* float * */ u, /* float * */ v, /* float * */ p, /* float * */ div )
{
	FOR_EACH_CELL(function(i,j){
		div[IX(i,j)] = -0.5*(u[IX(i+1,j)]-u[IX(i-1,j)]+v[IX(i,j+1)]-v[IX(i,j-1)])/N;
		p[IX(i,j)] = 0;
	});
	set_bnd ( 0, div ); 
	set_bnd ( 0, p );
	
	lin_solve ( 0, p, div, 1, 4 );
	
	FOR_EACH_CELL(function(i,j){
		u[IX(i,j)] -= 0.5*N*(p[IX(i+1,j)]-p[IX(i-1,j)]);
		v[IX(i,j)] -= 0.5*N*(p[IX(i,j+1)]-p[IX(i,j-1)]);
	});
	set_bnd ( 1, u ); 
	set_bnd ( 2, v );
}

function dens_step ( /* int */ N, /* float * */ x, /* float * */ x0, /* float * */ u, /* float * */ v, /*float*/ diff, /*float*/ dt )
{
	add_source (x, x0, dt );
	SWAP ( x0, x ); 
	diffuse (0, x, x0, diff, dt );
	SWAP ( x0, x ); 
	advect ( N, 0, x, x0, u, v, dt );
}

function vel_step (/*float * */ u, /*float * */ v, /* float * */ u_old, /* float * */ v_old, /* float */ visc, /* float */ dt )
{
	add_source (u, u_old, dt ); 
	add_source (v, v_old, dt );
	
	diffuse (1, u_old, u, visc, dt );
	diffuse (2, v_old, v, visc, dt );
	
	project ( N, u_old, v_old, u, v );
	
	advect ( N, 1, u, u_old, u_old, v_old, dt ); 
	advect ( N, 2, v, v_old, u_old, v_old, dt );
	
	project ( N, u, v, u_old, v_old );
}
