var con = document.getElementById("cont");		// 画布
var rNum = 0;  //行位数
var cNum = 0;	//列位数

var site = {start:{x:"",y:""},end:{x:"",y:""}};



for(var i=0;i<=9;i++){
	var row = document.createElement("ul");			//创建行
	rNum = i;
	row.className = "row";
	con.appendChild(row);
	for(var j=0;j<=19;j++){
		cNum = j;
		var col = document.createElement("li");		//创建列
		col.className = "col";
		col.rNum = rNum;
		col.cNum = cNum;
		row.appendChild(col);
	};
};

var grid = document.getElementsByClassName("col");	
var rGid = document.getElementsByClassName("row");	
for(var k in grid){
	grid[k].addEventListener("mousedown",start,false);
};

function start(){
	console.log("start");
	this.style.background = "blue";
	//console.log(this.rNum,this.cNum);
	site.start.x = this.rNum;
	site.start.y = this.cNum;
	for(var l in grid){
		grid[l].addEventListener("mousemove",proccess,false);
	};

};

function proccess(event){
var x = event.clientX;
var y = event.clientY;
	console.log(x,y);	
	con.style.cursor = "se-resize";
	this.style.background = "blue";
	for(var m in grid){
		grid[m].addEventListener("mouseup",end,false);
	};
};

function end(){
	console.log("end");	
	this.style.background = "blue";
	console.log(this.rNum,this.cNum);
	site.end.x = this.rNum;
	site.end.y = this.cNum;
	console.log(site.end.x);
	for(var sx=site.start.x;sx<=site.end.x;sx++){
		for(var sy=site.start.y;sy<=site.end.y;sy++){
				rGid[sx].getElementsByTagName("li")[sy].style.background = "blue";					
		};
	};
site = {start:{x:"",y:""},end:{x:"",y:""}};
	con.style.cursor = "cell";
	for(var n in grid){
		grid[n].removeEventListener("mousemove",proccess,false);
	};
	};














/*1*/


