const $=require("jquery")
let fs=require("fs");
const { get } = require("https");
let dialog=require("electron").remote.dialog;
$(document).ready(
    function(){
        let db=[];
        let lastSCell;
        let lastRowCell;
        let LastColCell;
        let cut,copy,paste;
        $("#grid .cell").on("click",function(){
            let rid=Number($(this).attr("row-id"));
            let cid=Number($(this).attr("col-id"));
            let ciAdrr = String.fromCharCode(cid + 65);
            $("#address-container").val(ciAdrr +(rid+1));
            $("#formula-container").val(db[rid][cid].formula);
            //check for styling buttons
            let cellObject=db[rid][cid];
            if(!cellObject.bold){
                $("#bold").removeClass("selected")
            }else{
                $("#bold").addClass("selected")
            }
            if(!cellObject.underline){
                $("#underline").removeClass("selected")
            }else{
                $("#underline").addClass("selected")
            }
            if(!cellObject.italic){
                $("#italic").removeClass("selected")
            }else{
                $("#italic").addClass("selected")
            }
            let align=cellObject.align;
            if(align.localeCompare("left")==0){
                $("#left").addClass("selected");
                $("#center").removeClass("selected")
                $("#right").removeClass("selected")
            }else if(align.localeCompare("center")==0){
                $("#center").addClass("selected");
                $("#left").removeClass("selected")
                $("#right").removeClass("selected")

            }else{
                $("#right").addClass("selected");
                $("#center").removeClass("selected")
                $("#left").removeClass("selected")
            }
            // drowpdown selected item value corrosponding to ccell
            $("#font-family").val(cellObject.fontfamily)
            $("#font-size").val(cellObject.fontSize)
            //color corrosponding to cell
            $("#text-color").val(cellObject.textColor)
            $("#bg-color").val(cellObject.bgColor)
            highlightedRC(rid,cid);
            $(this).addClass("selected");
            if (lastSCell && lastSCell != this){
                $(lastSCell).removeClass("selected");
            }
            lastSCell = this;
        })
        function highlightedRC(rid,cid){
            if(cid<0||cid>26||rid<0||rid>100){
                return;
            }
            let rows=$("#top-row").find(".cell")
            let cols=$("#left-col").find(".cell");
            //removing last highlighted cell
            if(lastRowCell!=rows[cid]){
            $(lastRowCell).removeClass("highlighted")
            }
            if(LastColCell!=cols[rid]){
            $(LastColCell).removeClass("highlighted")
            }
            //highlighting cell 
            $(rows[cid]).addClass("highlighted")
            $(cols[rid]).addClass("highlighted")
            lastRowCell=rows[cid];
            LastColCell=cols[rid];
        }
        $("#grid .cell").on("keyup",function(){
            let height=$(this).outerHeight();
            let rid=Number($(this).attr("row-id"));
            let cols=$("#left-col").find(".cell");
            $(cols[rid]).css("height",height+"px");

        })
        //move from one cell to another on arrow key press
        $("#grid .cell").keydown(function(e){
            let rid=Number($(this).attr("row-id"));
            let cid=Number($(this).attr("col-id"));
            switch(e.which){
                case 37: $(`#grid .cell[row-id=${rid}][col-id=${cid-1}]`).focus(); //left arrow
                         $(`#grid .cell[row-id=${rid}][col-id=${cid-1}]`).click();
                         break;
                case 38: $(`#grid .cell[row-id=${rid-1}][col-id=${cid}]`).focus(); // top arrow
                         $(`#grid .cell[row-id=${rid-1}][col-id=${cid}]`).click(); 
                         break;
                case 39: $(`#grid .cell[row-id=${rid}][col-id=${cid+1}]`).focus(); //right arrow
                         $(`#grid .cell[row-id=${rid}][col-id=${cid+1}]`).click();
                         break;
                case 40: $(`#grid .cell[row-id=${rid+1}][col-id=${cid}]`).focus(); //down arrow
                         $(`#grid .cell[row-id=${rid+1}][col-id=${cid}]`).click()
                         break;
            }
        })
        $("#File").on("click",function(){
            $("#File-options").toggleClass("file-selected")
            $("#Home-options").toggleClass("home-shift");
        })
        $("#Home").on("click",function(){
            $("#File-options").removeClass("file-selected")
            $("#Home-options").removeClass("home-shift");
        })
        $("#New").on("click",function(){
            let rows=$("#grid").find(".row")
            for(let i=0;i<rows.length;i++){
                let row=[];
                let cells=$(rows[i]).find(".cell");
                for(let j=0;j<cells.length;j++){
                    let cell={
                        value:"",
                        formula:"",
                        downstream:[],
                        upstream:[],
                        fontfamily: "Arial",
                        fontSize: 12,
                        bold: false,
                        underline: false,
                        italic: false,
                        textColor: "#000000",
                        bgColor: "#FFFFFF",
                        align: 'left'
                    }
                    $(cells[j]).html("");
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                    row.push(cell);
                }
                db.push(row);
            }
        })
        $("#grid .cell").on("blur",function(){
            let{rowId,colId}=getRc(this);  //get row and col id of current cell
            let cellObject=getCellObject(rowId,colId); // get cell object of cell
            if($(this).html()==cellObject.value){
                return;
            }
            if(cellObject.formula){
                removeFormula(cellObject,rowId,colId)
            }
            // updateCell=> update self // childrens(UI changes)
            updateCell(rowId,colId,$(this).html(),cellObject);
        })
        $("#cell-container").on("scroll",function(){
            let scrollX=$(this).scrollLeft();
            let scrollY=$(this).scrollTop();
            $("#top-left-cell , #top-row").css("top",scrollY+"px");
            $("#top-left-cell , #left-col").css("left",scrollX+"px");
        })
        $("#formula-container").on("blur",function(){
            let address=$("#address-container").val();
            let {rowId,colId}=getRcFromAddress(address);
            let cellObject=getCellObject(rowId,colId);
            let formula=$(this).val();
            if(formula.length==0)
            return;
            //formula validation using regular expression
            let regexp=/\(\s(?:[A-Z]\d{1,3}|\d*)(?:\s[+\/*-]\s(?:[A-Z]\d{1,3}|\d*))+\s\)/
            let isValid=regexp.test(formula);
            if(!isValid){
                dialog.showErrorBox("Please check the formula","1) Make sure to use Space after every operator/operand \n2) Use opening and closing brackets")
                return;
            }
            if(cellObject.formula==$(this).val()){
                return;
            }
            if(cellObject.formula){
                removeFormula(cellObject,rowId,colId)
            }
            cellObject.formula=formula;
            setUpFormula(rowId,colId,formula)
            //check if formula refers to it self
            let formulaComponent=formula.split(" ");
            let self=formulaComponent.includes(address);
            let set=new Set();
            let cyclic=isCyclic(cellObject,rowId,colId,set);
            if(cyclic||self){
                dialog.showErrorBox("There are one or more circular references where formula refers to its own cell","Try removing or changing these references")
                removeFormula(cellObject,rowId,colId)
                return;
            }
            let evaluatedVal=evaluate(cellObject);
            updateCell(rowId,colId,evaluatedVal,cellObject);
        })
        function isCyclic(cellObject,rowId,colId,set){
            let queue=[];
            queue.push(cellObject)
            while(queue.length>0){
                let cellObj=queue.shift();
                if(!set.has(JSON.stringify({rowId:rowId,colId:colId}))){
                    set.add(JSON.stringify({rowId:rowId,colId:colId}));
                    for(let i=0;i<cellObj.downstream.length;i++){
                        let chRC=cellObj.downstream[i];
                        let childObj=getCellObject(chRC.rowId,chRC.colId)
                        if(!set.has(JSON.stringify({rowId:chRC.rowId,colId:chRC.colId}))){
                            queue.push(childObj);
                        }
                    }
                }else{
                    return true;
                }
            }
            return false;
        }
        function setUpFormula(rowId,colId,formula){
            let cellObject=getCellObject(rowId,colId);
            let formulaComponent=formula.split(" ");
            for(let i=0;i<formulaComponent.length;i++){
                let code=formulaComponent[i].charCodeAt(0);
                if(code>=65&&code<=90){
                    let parentRc=getRcFromAddress(formulaComponent[i]);
                    let fParent=db[parentRc.rowId][parentRc.colId];
                    //set yourself to parent's downstream
                    fParent.downstream.push({
                        rowId,
                        colId
                    })
                    cellObject.upstream.push({
                        rowId: parentRc.rowId,
                        colId:parentRc.colId
                    })
                }
            }
        }
        function evaluate(cellObject){
            let formula=cellObject.formula;
            let formulaComponent=formula.split(" ");
            for(let i=0;i<formulaComponent.length;i++){
                let code=formulaComponent[i].charCodeAt(0);
                if(code>=65&&code<=90){
                    let parentRc=getRcFromAddress(formulaComponent[i]);
                    let fParent=db[parentRc.rowId][parentRc.colId];
                    let value=fParent.value;
                    formula=formula.replace(formulaComponent[i],value);
                }
            }
            let ans=infixEval(formula);
            return ans;
        }
        // solving the formula to get value
        let opst=[];
        let valst=[];
        function infixEval(formula){
            let formulacomp=formula.split(" ");
            for(let i=0;i<formulacomp.length;i++){
                let ch=formulacomp[i];
                if(ch.localeCompare("(")==0){
                    opst.push(ch);
                }else if(ch.localeCompare(")")==0){
                    while(opst[opst.length-1].localeCompare("(")!=0){
                        let operator=opst.pop();
                        let val2=valst.pop();
                        let val1=valst.pop();
                        let ans=solve(val1,val2,operator);
                        valst.push(ans);
                    }
                    opst.pop();
                }else if(ch.localeCompare("+")==0||ch.localeCompare("-")==0||ch.localeCompare("*")==0||ch.localeCompare("/")==0){
                    while(opst.length>0&&(opst[opst.length-1].localeCompare("(")!=0)&&precedence(ch)<=precedence(opst[opst.length-1])){
                        let operator=opst.pop();
                        let val2=valst.pop();
                        let val1=valst.pop();
                        let ans=solve(val1,val2,operator);
                        valst.push(ans);
                    }
                    opst.push(ch)
                }else if(!isNaN(ch)){
                    let no=Number(ch);
                    valst.push(no);
                }
            }
            while(opst.length>0){
                let operator=opst.pop();
                let val2=valst.pop();
                let val1=valst.pop();
                let ans=solve(val1,val2,operator);
                valst.push(ans);
            }
            return valst.pop();
        }
        function precedence(operator){
            if(operator.localeCompare("+")==0){
                return 1;
            }else if(operator.localeCompare("-")==0){
                return 1;
            }else if(operator.localeCompare("*")==0){
                return 2;
            }else{
                return 2;
            }
        }
        function solve(val1,val2,operator){
            if(operator.localeCompare("+")==0){
                return val1+val2;
            }else if(operator.localeCompare("-")==0){
                return val1-val2;
            }else if(operator.localeCompare("*")==0){
                return val1*val2;
            }else{
                return val1/val2;
            }
        }            // end of solve funtion
        function updateCell(rowId,colId,val,cellObject){
            $(`#grid .cell[row-id=${rowId}][col-id=${colId}]`).html(val);
            cellObject.value=val;
            for(let i=0;i<cellObject.downstream.length;i++){
                let dsorc=cellObject.downstream[i];
                let dsobj=db[dsorc.rowId][dsorc.colId];
                let evaluatedVal=evaluate(dsobj);
                updateCell(dsorc.rowId,dsorc.colId,evaluatedVal,dsobj);
            }
        }
        function removeFormula(cellObject,rowId,colId){
            for(let i=0;i<cellObject.upstream.length;i++){
                let uso=cellObject.upstream[i];
                let fuso=db[uso.rowId][uso.colId];
                let fds=fuso.downstream.filter(function(rc){
                    return !(rc.rowId==rowId&&rc.colId==colId)
                })
                fuso.downstream=fds;
            }
            cellObject.upstream=[];
            cellObject.formula="";
        }
        function getRcFromAddress(address){
            let colId = address.charCodeAt(0) - 65;
            let rowId = Number(address.substring(1)) - 1;
            return { colId, rowId };
        }
        function getRc(elem){
            let rowId = $(elem).attr("row-id");
            let colId = $(elem).attr("col-id");
            return {
                rowId,
                colId
            }
        }
        function getCellObject(rowId,colId){
            return db[rowId][colId];
        }
        $("#Save").on("click",function(){
            let path=dialog.showSaveDialogSync();
            let jsonData=JSON.stringify(db)
            fs.writeFileSync(path,jsonData);
        })
        $("#Open").on("click",async function(){
            let odb=await dialog.showOpenDialog();
            let fp=odb.filePaths[0];
            let content=fs.readFileSync(fp);
            let dbs=JSON.parse(content);
            let rows=$("#grid").find(".row")
            for(let i=0;i<rows.length;i++){
                let cells=$(rows[i]).find(".cell");
                for(let j=0;j<cells.length;j++){
                    let cell=db[i][j]
                    $(cells[j]).html(dbs[i][j].value);
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                }
            }
        })
        // home menu
        $("#bold").on("click",function(){
            $(this).toggleClass("selected");
            let isBold=$(this).hasClass("selected");
            $("#grid .cell.selected").css("font-weight",isBold?"bold":"normal");
            let selectedCell=$("#grid .cell.selected")
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].bold=isBold
        })
        $("#underline").on("click",function(){
            $(this).toggleClass("selected");
            let isUnderline=$(this).hasClass("selected");
            $("#grid .cell.selected").css("text-decoration",isUnderline?"underline":"none");
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].underline=isUnderline
        })
        $("#italic").on("click",function(){
            $(this).toggleClass("selected");
            let isItalic=$(this).hasClass("selected");
            $("#grid .cell.selected").css("font-style",isItalic?"italic":"normal");
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].italic=isItalic
        })
        $("#left").on("click",function(){
            $(this).toggleClass("selected");
            let isLeft=$(this).hasClass("selected");
            $("#grid .cell.selected").css("text-align",isLeft?"left":"left");
            $("#center").removeClass("selected")
            $("#right").removeClass("selected")
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].align=isLeft?"left":"left";
        })
        $("#center").on("click",function(){
            $(this).toggleClass("selected");
            let isCenter=$(this).hasClass("selected");
            $("#grid .cell.selected").css("text-align",isCenter?"center":"left");
            $("#left").removeClass("selected")
            $("#right").removeClass("selected")
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].align=isCenter?"center":"left"
        })
        $("#right").on("click",function(){
            $(this).toggleClass("selected");
            let isRight=$(this).hasClass("selected");
            $("#grid .cell.selected").css("text-align",isRight?"right":"left");
            $("#center").removeClass("selected")
            $("#left").removeClass("selected")
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].align=isRight?"right":"left";
        })
        $("#font-size").on("change",function(){
          let fontSize=$(this).val();
          $("#grid .cell.selected").css("font-size",fontSize+"px");
          let selectedCell=$("#grid .cell.selected");
          let {rowId,colId}=getRc(selectedCell);
          db[rowId][colId].fontSize=fontSize;
          //changing heigth of left col corrosponding to cell by calling keyup defined above
          $(selectedCell).keyup();
        })
        $("#font-family").on("change",function(){
            let fontfamily=$(this).val();
            $("#grid .cell.selected").css("font-family",fontfamily);
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].fontfamily=fontfamily;
          })
          $("#text-color").on("change",function(){
              let textColor=$(this).val();
              $("#grid .cell.selected").css("color",textColor);
              let selectedCell=$("#grid .cell.selected");
              let {rowId,colId}=getRc(selectedCell);
              db[rowId][colId].textColor=textColor;
          })
          $("#bg-color").on("change",function(){
            let bgColor=$(this).val();
            $("#grid .cell.selected").css("background-color",bgColor);
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            db[rowId][colId].bgColor=bgColor;
        })

        //cut,copy,paste button
        $("#copy").on("click",function(){
            copy=$("#grid .cell.selected").html();
            cut="";
        })
        $("#cut").on("click",function(){
            cut=$("#grid .cell.selected").html();
            copy="";
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            let cellObject=getCellObject(rowId,colId)
            if(cellObject.formula){
                removeFormula(cellObject,rowId,colId);
            }
            $(`#grid .cell[row-id=${rowId}][col-id=${colId}]`).html("");
            //change left col height
            $(selectedCell).keyup();
        })
        $("#paste").on("click",function(){
            paste=cut?cut:copy
            $("#grid .cell.selected").html=paste;
            if(!cut&&!copy){
                return
            }
            let selectedCell=$("#grid .cell.selected");
            let {rowId,colId}=getRc(selectedCell);
            let cellObject=getCellObject(rowId,colId)
            if(cellObject.formula){
                removeFormula(cellObject,rowId,colId);
            }
            updateCell(rowId,colId,paste,cellObject)
            paste=""
            cut=""
            copy=""
        })
        // 
        $("#delete-row").on("click",function(){
           let rowId= Number($("#grid .cell.selected").attr("row-id"));
           if(Number.isNaN(rowId)){
            dialog.showErrorBox("Can't delete a row","Please select a cell first")
            return;
            }
            db.splice(rowId,1)
            let row=[]
            for(let col=0;col<db[0].length;col++){
                let cell={
                    value:"",
                    formula:"",
                    downstream:[],
                    upstream:[],
                    fontfamily: "Arial",
                    fontSize: 12,
                    bold: false,
                    underline: false,
                    italic: false,
                    textColor: "#000000",
                    bgColor: "#FFFFFF",
                    align: 'left'
                    }
                row.push(cell);
            }
            db.push(row);
            let rows=$("#grid").find(".row")
            for(let i=rowId;i<rows.length;i++){
                let cells=$(rows[i]).find(".cell");
                for(let j=0;j<cells.length;j++){
                    let cell=db[i][j]
                    $(cells[j]).html(db[i][j].value);
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                }
            }
        })
        $("#insert-row").on("click",function(){
            let rowId= Number($("#grid .cell.selected").attr("row-id"));
            if(Number.isNaN(rowId)){
                dialog.showErrorBox("Can't add a row","Please select a cell first")
                return;
            }
            let row=[]
            for(let col=0;col<db[0].length;col++){
                let cell={
                    value:"",
                    formula:"",
                    downstream:[],
                    upstream:[],
                    fontfamily: "Arial",
                    fontSize: 12,
                    bold: false,
                    underline: false,
                    italic: false,
                    textColor: "#000000",
                    bgColor: "#FFFFFF",
                    align: 'left'
                    }
                row.push(cell);
            }
            db.splice(rowId,0,row);
            db.pop();
             let rows=$("#grid").find(".row")
            for(let i=rowId;i<rows.length;i++){
                let cells=$(rows[i]).find(".cell");
                for(let j=0;j<cells.length;j++){
                    let cell=db[i][j]
                    $(cells[j]).html(db[i][j].value);
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                }
            }
        })
        $("#delete-col").on("click",function(){
            let colId= Number($("#grid .cell.selected").attr("col-id"));
            if(Number.isNaN(colId)){
                dialog.showErrorBox("Can't delete a column","Please select a cell first")
                return;
            }
            for(let row=0;row<db.length;row++){
                let cell={
                    value:"",
                    formula:"",
                    downstream:[],
                    upstream:[],
                    fontfamily: "Arial",
                    fontSize: 12,
                    bold: false,
                    underline: false,
                    italic: false,
                    textColor: "#000000",
                    bgColor: "#FFFFFF",
                    align: 'left'
                    }
                    db[row].splice(colId,1);
                    db[row].push(cell);
            }
            let rows=$("#grid").find(".row")
            for(let i=0;i<rows.length;i++){
                let cells=$(rows[i]).find(".cell");
                for(let j=colId;j<cells.length;j++){
                    let cell=db[i][j]
                    $(cells[j]).html(db[i][j].value);
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                }
            }
        })
        $("#insert-col").on("click",function(){
            let colId= Number($("#grid .cell.selected").attr("col-id"));
            if(Number.isNaN(colId)){
                dialog.showErrorBox("Can't add a column","Please select a cell first")
                return;
            }
            for(let row=0;row<db.length;row++){
                let cell={
                    value:"",
                    formula:"",
                    downstream:[],
                    upstream:[],
                    fontfamily: "Arial",
                    fontSize: 12,
                    bold: false,
                    underline: false,
                    italic: false,
                    textColor: "#000000",
                    bgColor: "#FFFFFF",
                    align: 'left'
                    }
                    db[row].splice(colId,0,cell);
                    db[row].pop();
            }
            let rows=$("#grid").find(".row")
            for(let i=0;i<rows.length;i++){
                let cells=$(rows[i]).find(".cell");
                for(let j=colId;j<cells.length;j++){
                    let cell=db[i][j]
                    $(cells[j]).html(db[i][j].value);
                    $(cells[j]).css("font-family",cell.fontfamily);
                    $(cells[j]).css("font-size",cell.fontSize+"px");
                    $(cells[j]).css("font-weight",cell.bold?"bold":"normal");
                    $(cells[j]).css("text-decoration",cell.underline?"underline":"none");
                    $(cells[j]).css("font-style",cell.italic?"italic":"normal");
                    $(cells[j]).css("color",cell.textColor);
                    $(cells[j]).css("background-color",cell.bgColor);
                    $(cells[j]).css("text-align",cell.align);
                }
            }
        })
        function init(){
            $("#File").trigger("click")
            $("#New").click();
            $("#Home").trigger("click")
        }
        init();
    }
);