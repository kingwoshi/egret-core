/**
 * Copyright (c) Egret-Labs.org. Permission is hereby granted, free of charge,
 * to any person obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/// <reference path="../../../egret/display/DisplayObject.ts"/>
/// <reference path="../../../egret/events/Event.ts"/>
/// <reference path="../../../egret/geom/Point.ts"/>
/// <reference path="../../../egret/geom/Rectangle.ts"/>
/// <reference path="supportClasses/Animation.ts"/>
/// <reference path="../core/IInvalidating.ts"/>
/// <reference path="../core/IUIComponent.ts"/>
/// <reference path="../core/IVisualElement.ts"/>
/// <reference path="../core/PopUpPosition.ts"/>
/// <reference path="../core/UIComponent.ts"/>
/// <reference path="../managers/PopUpManager.ts"/>

module ns_egret {

	export class PopUpAnchor extends UIComponent{
		/**
		 * 构造函数
		 */		
		public constructor(){
			super();
			this.addEventListener(Event.ADDED_TO_STAGE, this.addedToStageHandler, this);
			this.addEventListener(Event.REMOVED_FROM_STAGE, this.removedFromStageHandler, this);
		}
		/**
		 * popUp已经弹出的标志
		 */		
		private popUpIsDisplayed:boolean = false;
		/**
		 * 自身已经添加到舞台标志
		 */		
		private addedToStage:boolean = false;
		
		private _popUpHeightMatchesAnchorHeight:boolean = false;
		/**
		 * 如果为 true，则将popUp控件的高度设置为 PopUpAnchor的高度值。
		 */
		public get popUpHeightMatchesAnchorHeight():boolean{
			return this._popUpHeightMatchesAnchorHeight;
		}
		public set popUpHeightMatchesAnchorHeight(value:boolean){
			if (this._popUpHeightMatchesAnchorHeight == value)
				return;
			
			this._popUpHeightMatchesAnchorHeight = value;
			
			this.invalidateDisplayList();
		}
		
		private _popUpWidthMatchesAnchorWidth:boolean = false;
		/**
		 * 如果为true，则将popUp控件的宽度设置为PopUpAnchor的宽度值。
		 */		
		public get popUpWidthMatchesAnchorWidth():boolean{
			return this._popUpWidthMatchesAnchorWidth;
		}
		public set popUpWidthMatchesAnchorWidth(value:boolean){
			if (this._popUpWidthMatchesAnchorWidth == value)
				return;
			
			this._popUpWidthMatchesAnchorWidth = value;
			
			this.invalidateDisplayList();
		}
		
		private _displayPopUp:boolean = false;
		/**
		 * 如果为 true，则将popUp对象弹出。若为false，关闭弹出的popUp。
		 */		
		public get displayPopUp():boolean{
			return this._displayPopUp;
		}
		public set displayPopUp(value:boolean){
			if (this._displayPopUp == value)
				return;
			
			this._displayPopUp = value;
			this.addOrRemovePopUp();
		}
		
		
		private _popUp:IVisualElement;
		/**
		 * 要弹出或移除的目标显示对象。
		 */		
		public get popUp():IVisualElement{ 
			return this._popUp 
		}
		public set popUp(value:IVisualElement){
			if (this._popUp == value)
				return;
			
			this._popUp = value;
			
			this.dispatchEvent(new Event("popUpChanged"));
		}
		
		private _popUpPosition:string = PopUpPosition.TOP_LEFT;
		/**
		 * popUp相对于PopUpAnchor的弹出位置。请使用PopUpPosition里定义的常量。默认值TOP_LEFT。
		 * @see org.flexlite.domUI.core.PopUpPosition
		 */		
		public get popUpPosition():string{
			return this._popUpPosition;
		}
		public set popUpPosition(value:string){
			if (this._popUpPosition == value)
				return;
			
			this._popUpPosition = value;
			this.invalidateDisplayList();    
		}
		
		/**
		 * @inheritDoc
		 */
		public updateDisplayList(unscaledWidth:number, unscaledHeight:number):void{
			super.updateDisplayList(unscaledWidth, unscaledHeight);                
			this.applyPopUpTransform(unscaledWidth, unscaledHeight);            
		}
		/**
		 * 手动刷新popUp的弹出位置和尺寸。
		 */		
		public updatePopUpTransform():void{
			this.applyPopUpTransform(this.width, this.height);
		}
		/**
		 * 计算popUp的弹出位置
		 */		
		private calculatePopUpPosition():Point{
			var registrationPoint:Point = new Point();
			switch(this._popUpPosition){
				case PopUpPosition.BELOW:
					registrationPoint.x = 0;
					registrationPoint.y = this.height;
					break;
				case PopUpPosition.ABOVE:
					registrationPoint.x = 0;
					registrationPoint.y = -this.popUp.layoutBoundsHeight;
					break;
				case PopUpPosition.LEFT:
					registrationPoint.x = -this.popUp.layoutBoundsWidth;
					registrationPoint.y = 0;
					break;
				case PopUpPosition.RIGHT:
					registrationPoint.x = this.width;
					registrationPoint.y = 0;
					break;            
				case PopUpPosition.CENTER:
					registrationPoint.x = (this.width - this.popUp.layoutBoundsWidth)*0.5;
					registrationPoint.y = (this.height - this.popUp.layoutBoundsHeight)*0.5;
					break;            
				case PopUpPosition.TOP_LEFT:
					break;
			}
			registrationPoint = this.localToGlobal(registrationPoint);
			registrationPoint = this.popUp.parent.globalToLocal(registrationPoint);
			return registrationPoint;
		}
		
		/**
		 * 正在播放动画的标志
		 */		
		private inAnimation:boolean = false;
		
		private _animator:Animation = null;
		/**
		 * 动画类实例
		 */		
		private get animator():Animation{
			if (this._animator)
				return this._animator;
			this._animator = new Animation(this.animationUpdateHandler);
			this._animator.endFunction = this.animationEndHandler;
			this._animator.startFunction = this.animationStartHandler;
			return this._animator;
		}
		
		private _openDuration:number = 250;
		/**
		 * 窗口弹出的动画时间(以毫秒为单位)，设置为0则直接弹出窗口而不播放动画效果。默认值250。
		 */
		public get openDuration():number{
			return this._openDuration;
		}
		
		public set openDuration(value:number){
			this._openDuration = value;
		}
		
		private _closeDuration:number = 150;
		/**
		 * 窗口关闭的动画时间(以毫秒为单位)，设置为0则直接关闭窗口而不播放动画效果。默认值150。
		 */
		public get closeDuration():number{
			return this._closeDuration;
		}

		public set closeDuration(value:number){
			this._closeDuration = value;
		}

		/**
		 * 动画开始播放触发的函数
		 */		
		private animationStartHandler(animation:Animation):void{
			this.inAnimation = true;
			this.popUp.addEventListener("scrollRectChange",this.onScrollRectChange,this);
			if(this.popUp is IUIComponent)
				(<IUIComponent> (this.popUp)).enabled = false;
		}
		/**
		 * 防止外部修改popUp的scrollRect属性
		 */		
		private onScrollRectChange(event:Event):void{
			if(this.inUpdating)
				return;
			this.inUpdating = true;
			(<DisplayObject> (this.popUp)).scrollRect = new Rectangle(Math.round(this.animator.currentValue["x"]),
				Math.round(this.animator.currentValue["y"]),this.popUp.width, this.popUp.height);
			this.inUpdating = false;
		}
		
		private inUpdating:boolean = false;
		/**
		 * 动画播放过程中触发的更新数值函数
		 */		
		private animationUpdateHandler(animation:Animation):void{
			this.inUpdating = true;
			(<DisplayObject> (this.popUp)).scrollRect = new Rectangle(Math.round(animation.currentValue["x"]),
				Math.round(animation.currentValue["y"]),this.popUp.width, this.popUp.height);
			this.inUpdating = false;
		}
		
		/**
		 * 动画播放完成触发的函数
		 */		
		private animationEndHandler(animation:Animation):void{
			this.inAnimation = false;
			this.popUp.removeEventListener("scrollRectChange",this.onScrollRectChange,this);
			if(this.popUp is IUIComponent)
				(<IUIComponent> (this.popUp)).enabled = true;
			(<DisplayObject> (this.popUp)).scrollRect = null;
			if(!this.popUpIsDisplayed){
				PopUpManager.removePopUp(this.popUp);
				this.popUp.ownerChanged(null);
			}
		}
		
		/**
		 * 添加或移除popUp
		 */		
		private addOrRemovePopUp():void{
			if (!this.addedToStage||!this.popUp)
				return;
			
			if (this.popUp.parent == null && this.displayPopUp){
				PopUpManager.addPopUp(this.popUp,false,false,this.systemManager);
				this.popUp.ownerChanged(this);
				this.popUpIsDisplayed = true;
				if(this.inAnimation)
					this.animator.end();
				if(this.initialized){
					this.applyPopUpTransform(this.width, this.height);
					if(this._openDuration>0)
						this.startAnimation();
				}
				else{
					this.callLater(function():void{
						if(this._openDuration>0)
							this.startAnimation();
					});
				}
			}
			else if (this.popUp.parent != null && !this.displayPopUp){
				this.removeAndResetPopUp();
			}
		}
		/**
		 * 移除并重置popUp
		 */		
		private removeAndResetPopUp():void{
			if(this.inAnimation)
				this.animator.end();
			this.popUpIsDisplayed = false;
			if(this._closeDuration>0){
				this.startAnimation();
			}
			else{
				PopUpManager.removePopUp(this.popUp);
				this.popUp.ownerChanged(null);
			}
		}
		/**
		 * 对popUp应用尺寸和位置调整
		 */		
		private applyPopUpTransform(unscaledWidth:number, unscaledHeight:number):void{
			if (!this.popUpIsDisplayed)
				return;
			if (this.popUpWidthMatchesAnchorWidth)
				this.popUp.width = unscaledWidth;
			if (this.popUpHeightMatchesAnchorHeight)
				this.popUp.height = unscaledHeight;
			if(this.popUp is IInvalidating)
				(<IInvalidating> (this.popUp)).validateNow();
			var popUpPoint:Point = this.calculatePopUpPosition();
			this.popUp.x = popUpPoint.x;
			this.popUp.y = popUpPoint.y;
		}
		/**
		 * 开始播放动画
		 */		
		private startAnimation():void{
			this.animator.motionPaths = this.createMotionPath();
			if(this.popUpIsDisplayed){
				this.animator.duration = this._openDuration;
			}
			else{
				this.animator.duration = this._closeDuration;
			}
			this.animator.play();
		}
		
		private valueRange:number = 1;
		/**
		 * 创建动画轨迹
		 */		
		private createMotionPath():Vector.<MotionPath>{
			var xPath:MotionPath = new MotionPath("x");
			var yPath:MotionPath = new MotionPath("y");
			var path:Vector.<MotionPath> = new <MotionPath>[xPath,yPath];
			switch(this._popUpPosition){
				case PopUpPosition.TOP_LEFT:
				case PopUpPosition.CENTER:
				case PopUpPosition.BELOW:
					xPath.valueFrom = xPath.valueTo = 0;
					yPath.valueFrom = this.popUp.height;
					yPath.valueTo = 0;
					this.valueRange = this.popUp.height;
					break;
				case PopUpPosition.ABOVE:
					xPath.valueFrom = xPath.valueTo = 0;
					yPath.valueFrom = -this.popUp.height;
					yPath.valueTo = 0;
					this.valueRange = this.popUp.height;
					break;
				case PopUpPosition.LEFT:
					yPath.valueFrom = yPath.valueTo = 0;
					xPath.valueFrom = -this.popUp.width;
					xPath.valueTo = 0;
					this.valueRange = this.popUp.width;
					break;
				case PopUpPosition.RIGHT:
					yPath.valueFrom = yPath.valueTo = 0;
					xPath.valueFrom = this.popUp.width;
					xPath.valueTo = 0;
					this.valueRange = this.popUp.width;
					break;    
				default:
					this.valueRange = 1;
					break;
			}
			this.valueRange = Math.abs(this.valueRange);
			if(!this.popUpIsDisplayed){
				var tempValue:number = xPath.valueFrom;
				xPath.valueFrom = xPath.valueTo;
				xPath.valueTo = tempValue;
				tempValue = yPath.valueFrom;
				yPath.valueFrom = yPath.valueTo;
				yPath.valueTo = tempValue;
			}
			return path;
		}
		/**
		 * 添加到舞台事件
		 */		
		private addedToStageHandler(event:Event):void{
			this.addedToStage = true;
			this.callLater(this.checkPopUpState);
		}
		
		/**
		 * 延迟检查弹出状态，防止堆栈溢出。
		 */		
		private checkPopUpState():void{
			if(this.addedToStage){
				this.addOrRemovePopUp();    
			}
			else{
				if (this.popUp != null && (<DisplayObject> (this.popUp)).parent != null)
					this.removeAndResetPopUp();
			}
		}
		
		/**
		 * 从舞台移除事件
		 */		
		private removedFromStageHandler(event:Event):void{
			this.addedToStage = false;
			this.callLater(this.checkPopUpState);
		}
		
	}
}