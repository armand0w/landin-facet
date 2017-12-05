import { Component, OnInit } from '@angular/core';
import { AplicativoService } from '../../services/aplicativo.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {

  public completado: number;
  public onProgress: boolean;
  public message: string;
  public url: string;

  public urLanding: string;
  public cliente: any;
  public eventos: object [];

  constructor( protected _aplicativoService: AplicativoService,
               private _modalService: NgbModal ) {}

  ngOnInit() {
    this.cliente = { };

    this._aplicativoService.properties()
      .then( ( prop ) => {
        this.urLanding = prop['url-services'];

        this.eventos = [
          {
            url: this.urLanding + 'acl',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Obteniendo credenciales ACL.' }
          },
          {
            url: this.urLanding + 'broker',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: {  message: 'Creando usuario Broker.' }
          },
          {
            url: this.urLanding + 'paquete',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Creando paquete de timbres.' }
          },
          {
            url: this.urLanding + 'usuariopac',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Obteniendo credenciales PAC.' }
          },
          {
            url: this.urLanding + 'tokenpac',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Creando token de API en PAC.' }
          }
        ];
      });

    this.completado = 0;
    this.onProgress = false;
  }

  public crearApp(): void {
    this.onProgress = true;

    this.loopEvents()
      .then( (res) => {
        this.open( res );
      });
  }

  public open( response: any ): void {
    const modalRef = this._modalService.open( ModalComponent, { size: 'lg'} );

    if ( response['continue'] ) {
      modalRef.componentInstance.inputs = {
        title: '¡Aviso!',
        typeClass: 'modal-header bg-success text-white',
        textContent: 'Se ha enviado un correo de confirmación a su cuenta de correo electronico.'
      };
    } else {
      modalRef.componentInstance.inputs = {
        title: '¡Error!',
        typeClass: 'modal-header bg-danger text-white',
        textContent: response['message']
      };
    }

    modalRef.result.then((reason) => {
      // location.reload();
    });
  }

  private loopEvents = () => {
    let lastResponse = {};
    return new Promise((resolve, reject) => {
      const loop = ( cont ) => {
        const item = this.eventos[cont];
        let continueLoop = true;

        if ( continueLoop ) {
          this.message = item['body']['message'];
          item['body'] = this.cliente;
          this._aplicativoService.consumirPromesa( item )
            .then( ( data ) => {
              lastResponse = data;
              this.message = data['message'];
              if ( data && data['continue'] ) {
                this.completado += Math.floor( 100 / this.eventos.length );
              } else {
                continueLoop = false;
              }
            })
            .catch( err => {
              if ( err.status === 0 || err.status === 502 ) {
                this.message = 'Schema creado.';
                this.completado += Math.floor( 100 / this.eventos.length );
                continueLoop = true;
              } else {
                continueLoop = false;
                reject( err );
              }
            })
            .then( () => {
              if ( continueLoop && cont !== this.eventos.length - 1 ) {
                loop( ++cont );
              } else {
                lastResponse['rootEvent'] = item;
                resolve( lastResponse );
              }
            });
        }
      };

      loop( 0 );
    });
  }
}
