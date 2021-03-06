import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Business } from '../../business/api/business';
import { CurrentUser } from '../../common/auth/current-user';
import { OrderItems } from '../../pos/cart/order_items';
import { Orders } from '../../orders/orders';
import { Invoice, Status, PaymentMethod } from '../../invoices/invoice';
import { randomString } from '../../common/core/utils/random-string';
import { Select, Store } from '@ngxs/store';
import { PosOrderState } from '../../store/states/PosOrderStates';
import { CurrentOrder, CreateInvoice, InvoiceDetails } from '../../store/actions/pos-Order.action';
import { Customer } from '../../customers/customer';
import { MatDialog } from '@angular/material';
import { PrintReceiptModelComponent } from '../../print-out/print-receipt-model/print-receipt-model.component';
import { Modal } from '../../common/core/ui/dialogs/modal.service';
import { ConfirmModalComponent } from '../../common/core/ui/confirm-modal/confirm-modal.component';
import { PosCateoriesState } from '../../store/states/PosCategoryStates';
import { Category } from '../../admin/master/categories/api/category';
import { Router } from '@angular/router';
import { ClosePosCategory } from '../../store/actions/pos-categories.action';
@Component({
  selector: 'app-pay',
  templateUrl: './pay.component.html',
  styleUrls: ['./pay.component.scss']
})
export class PayComponent implements OnInit {
  business: Business;
  data: OrderItems[] = [];

  numeric_selector:any=0.00;
  amount_return:number=0.00;
  amount_given:number=0.00;
  d_amount_return:number=0.00;
  amount_return_color:string='black';
  d_amount_return_color:string='black';
  currently_ordered:Orders=null;
  transction_done:boolean=false;
  preview:boolean=false;
  @Select(PosOrderState.selectedOrders) current_order$: Observable<Orders>;
  @Select(PosOrderState.loading) loading$: Observable<boolean>;
  @Select(PosOrderState.customerOrder) customer$: Observable<Customer>;
  @Select(PosOrderState.currentInvoice) invoice$: Observable<Invoice>;
  @Select(PosCateoriesState.category) category$: Observable<Category>;
  customer: Customer=null;
  invoice: Invoice=null;
  canPrintOut: boolean=false;

  constructor(
    private router: Router,
    public dialog: MatDialog,
    private store:Store,
    public currentUser: CurrentUser,
    private modal: Modal
  ){ }

  ngOnInit() {
    this.store.dispatch(new InvoiceDetails(null));

    if (this.current_order$) {
    this.loadOrder();
    this.amount_given=this._total('total_amount');
    this.numeric_selector = this._total('total_amount');
    this.amount_return= this.numeric_selector == 0?0.00:this.numeric_selector-this._total('total_amount');
    }else{
      this.store.dispatch(new CurrentOrder());
    }
    if(this.customer$){
      this.loadCustomer();
    }
  }

  loadOrder(){
    if (this.current_order$) {
      this.current_order$.subscribe(res => {
        if (res) {
          this.currently_ordered=res?res:null;
          this.data = res.order_items?res.order_items:[];
        }

      });
    }
  }
loadCustomer(){
  this.customer$.subscribe(customer=>{
    if(customer){
      this.customer= customer as Customer;
    }else{
      this.customer=null;
    }
  });
}


  _total(prop) {
    var total = 0;
    if (this.data.length > 0) {
      for (var i = 0, _len = this.data.length; i < _len; i++) {
        total += this.data[i][prop]
      }
    }
    return total?total:0.00;

  }


  total(prop) {
    var total = 0;
    if (this.data.length > 0) {
      for (var i = 0, _len = this.data.length; i < _len; i++) {
        total += this.data[i][prop]
      }
    }
    return total?total:0.00;

  }
  keysClicked(key) {
      if (key == 'x') {
             this.numeric_selector=0;

      } else {
        this.numeric_selector=this.numeric_selector==0?key:this.numeric_selector+''+key;
        this.numeric_selector =this.numeric_selector.replace('..', ".");
      }
      this.displayBalanceChangesDue();
    }
    mainKeyClicked(key){
      this.numeric_selector=0;
      this.numeric_selector=key;
      this.displayBalanceChangesDue();
    }
    displayBalanceChangesDue(){
      this.amount_return=0;
      this.amount_return= this.numeric_selector == 0?0:this.numeric_selector-this._total('total_amount');
      this.amount_given=this.numeric_selector;
      if(this.amount_return > 0 || this.amount_return == this._total('total_amount')){
        this.amount_return_color='green';
      }else if(this.amount_return == 0){
        this.amount_return_color='black';
      }else if(this.amount_return < 0 || this.amount_return > this._total('total_amount')){
        this.amount_return_color='red';
      }
      //discount
      this.d_amount_return=0;
      this.d_amount_return= this.numeric_selector == 0?0: this._total('total_amount_discount')==0.00?0.00:this.numeric_selector-this._total('total_amount_discount');
      if(this.d_amount_return > 0 || this.d_amount_return == this._total('total_amount_discount')){
        this.d_amount_return_color='green';
      }else if(this.d_amount_return == 0){
        this.d_amount_return_color='black';
      }else if(this.d_amount_return < 0 || this.d_amount_return > this._total('total_amount')){
        this.d_amount_return_color='red';
      }
    }

    setInputToNull(){
      this.numeric_selector = null;
    }
    setInputToValueble(){
      if( this.numeric_selector === null){
        this.numeric_selector = this._total('total_amount');
        this.displayBalanceChangesDue();
      }

    }

    async payingInvoice(){
      this.loadOrder();
      if(this.transction_done){
        this.message('Create New Order','Go');
        return;
      }
     
      if(!this.currently_ordered || this.data.length == 0){
        this.message('Create New Order','Go');
        return;  
      }
      if(this.amount_return_color =='red'){
        this.message('Check Amount Paid!','Check');
        return; 
      }
      if(this.currently_ordered){
          
            this.transction_done=true;
            this.store.dispatch(new InvoiceDetails(null));
            const forming_invoice:Invoice={
              invoice_no:randomString(6),
              invoice_date:new Date(),
              total_discounts:this._total('total_amount_discount'),
              total_items:this._total('qty'),
              taxable_vat:this._total('taxable_vat'),
              total_amount:this._total('total_amount'),
              amount_given:this.amount_given,
              amount_return:this.amount_return,
              status:Status.COMPLETE,
              branch_id: parseInt(localStorage.getItem('active_branch')),
              payment_method:PaymentMethod.CASH,
              order:this.currently_ordered?this.currently_ordered:null,
              orderItems:this.data,
              tax_rate_id:null,
              order_id:this.currently_ordered.id,
              customer_id:this.customer?this.customer.id:null,
              customer_type_id:this.customer?this.customer.customer_type?this.customer.customer_type.id:null:null
            }
            this.store.dispatch(new CreateInvoice(forming_invoice));
            this.data=[];
            this.numeric_selector=0.00;
              if(this.invoice$){
                await this.printDirectReceipt(true);
               }
            
        }
        

    }
    public message(message,action) {
      this.modal.open(ConfirmModalComponent, {
          title: 'Transction',
          body:  message,
          ok:    action
      },
      {
        width: '380px'
      }
      ).afterClosed().subscribe(confirmed => {
          if(!confirmed)return;
          if(action=='Go'){
            this.store.dispatch(new ClosePosCategory());
            return this.router.navigate(['/admin/pos/till-categories']);
          }
         
      });
  }

 
    printDirectReceipt(has_balance=false){
      this.invoice$.subscribe(invoice => {
        if(invoice){
          this.printReceiptModel(invoice,has_balance)  
        }});
    }
   

    printReceiptModel(invoice?: Invoice,has_balance=false) {
      this.dialog.open(PrintReceiptModelComponent, {
        width: '400px',
        data: invoice?invoice:null
      });
    }


}
