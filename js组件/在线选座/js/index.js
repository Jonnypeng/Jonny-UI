var $ = function (id){
	return document.getElementById(id);
};

var $c = function(classname){
	return document.getElementsByClassName(classname);
};
var buyBtn = $("buy");
var seatChoiced = $("seat_num_choiced");
var	seatDe = document.getElementById("seat_detail"); 	//座位区域	
var seatNum = 251;									//座位
var priceTotal = 0;
var rows = 1;
var seatNone = $("seat_none");
var sofaType = {"unchoice":{a:"icons/unchoice-a.svg",b:"icons/unchoice-b.svg",c:"icons/unchoice-c.svg",},"choiced":"icons/choice.svg","sold":"icons/sales.svg"};
var seatArr = {
	chose:[],			//所有座位	
	sold:[],			//已经售出的座位
	cart:[],				//购买成功提交的座位		
	price:[],    //购物车内的每个座位的价格
	total:[]		//总共的票数销售额
};
window.addEventListener("load",mkSeat,false);			//载入后，自动创建座位
buyBtn.addEventListener("click",success,false);

function mkSeat(){									//批量创建元素	
	for(var i = 0;i<=seatNum;i++){
		if(i%18==0){
			var span = document.createElement("span");	
			span.className = "numIcon";
			span.innerHTML = rows;
			seatDe.appendChild(span);
			rows+=1;
		}else{
			var sofa = document.createElement("img");	
			sofa.className="sofa";
			sofa.seatName=rows-1 + "排" + i%18 + "号";
			if(i>0 && i<=71 ){
				sofa.icon =sofaType.unchoice.a; 
				sofa.src = sofa.icon;
				sofa.type = "甲票";
				sofa.price = 150;
			}else if(i>71 && i<=143){
				sofa.icon=sofaType.unchoice.b;
				sofa.src = sofa.icon;
				sofa.type = "乙票";
				sofa.price = 100;
			}else if(i>143 && i<=251){
				sofa.icon=sofaType.unchoice.c;
				sofa.src = sofa.icon;
				sofa.type = "丙票";
				sofa.price = 50;
			};
			sofa.title = sofa.seatName + ":" +sofa.type + ":" + sofa.price + "元";
			sofa.chOff = true;  //先设置为可选模式
			sofa.addEventListener("click",choice,false);		//绑定点击沙发的事件
			seatArr.chose.push(sofa.seatName);    //推送到可选数组
			seatDe.appendChild(sofa);
		}
	};
};

var sofa = $c("sofa");
var choicedArr = [];
var caNum = -1;
var caSum = 0;


function choice(){
	if(this.chOff){
		caNum++;
		this.src = sofaType.choiced;				//改变已选模式的图标	
		this.chOff = false;
		choicedArr.push(this.seatName);				//向数组推送元素
		seatArr.price.push(this.price);       //为购物车数组推送数据
		//console.log(seatArr.price);
		this.num =	caNum; 									//为事件元素设置属性与数组下标同步
		var	seatDD = document.createElement("div"); 
		seatDD.className = "seat_num_dd";
		seatDD.id = this.num;
		seatDD.innerHTML = "<small>" + this.seatName + "</small><br>" +	"<small>" + this.type + "</small><br>" +"<small class=\"price\">" + this.price + "元" +"</small>" + "<span class=\"fa fa-check-circle\"></span>";
		seatChoiced.appendChild(seatDD);
		seatNone.style.display = "none";		//点击位置，卸载默认样式
		buyBtn.removeAttribute("class");		//点击位置，卸载默认样式
	}else{
		this.src = this.icon;       //改变为未选模式的图标	
		this.chOff = true;
		delete choicedArr[this.num];				//删除元素下标位置的数组元素
		delete seatArr.price[this.num];			//删除购物车数组的对应价格数据
		//console.log(seatArr.price);
		seatChoiced.removeChild($(this.num));
		if(seatChoiced.childNodes.length==3){			//判断已选择位置的容器下的子节点长度为3,就是空，进行逻辑动作
			seatNone.style.display = "block";				//为空，恢复默认样式
			buyBtn.setAttribute("class","un_submit");   //为空，恢复默认样式				
		};
	};
};
function success(){				//验证是否确认购买
	var CPT = cartPrice();
	var r = confirm("亲，" + "您将支付" + CPT + "元" + ",确认要购买吗？" );	
	if(r==true){
		ok();	
	}else{
		return;	
	}
	function cartPrice(){			//购物车价格计算
		var cartPriceTotal = 0;
		seatArr.price.forEach(function(e){
			cartPriceTotal+=e;
		});
		return cartPriceTotal;
		console.log("每次的购物车价格总计",cartPriceTotal);
	};
	function ok(){
		seatArr.cart.splice(0,seatArr.cart.length);				//清空购物车的数据
		choicedArr.forEach(function (e){
			seatArr.cart.push(e);													//推送购物车的数据
			seatArr.sold.push(e)													//推送已经售出的数据
		});		
		seatArr.sold.forEach(function (e){
			sofa[seatArr.chose.indexOf(e)].src=sofaType.sold;				//绑定已购买的数组调用到可选择的数组找出序列引用到所有沙发的位置进行更改
			sofa[seatArr.chose.indexOf(e)].removeEventListener("click",choice,false);					//解除点击事件的绑定
			//console.log(sofa[seatArr.chose.indexOf(e)].status);
		});
		//console.log(seatArr.sold);
		choicedArr.splice(0,choicedArr.length);
		//console.log(choicedArr);
		seatArr.total = seatArr.total.concat(seatArr.price);	//价格总计合并购物车的数据
		seatArr.total.forEach(function (e){
		priceTotal+=e; 	
		});
		seatArr.price.splice(0,seatArr.price.length);		//清空购物车价格
		seatChoiced.innerHTML = "";
		seatChoiced.appendChild(seatNone);
		seatNone.style.display = "block";				//为空，恢复默认样式
		console.log("总售价格组成",seatArr.total);
		console.log("购物车数据",seatArr.cart);
		console.log("已经售出的票的总数据",seatArr.sold);
		console.log("已经售出的销售额",priceTotal);
	};
}
