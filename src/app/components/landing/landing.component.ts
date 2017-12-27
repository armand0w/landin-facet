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
        this.cliente['i_tipo_timbre'] = 1;
        this.cliente['connections'] = {
          references: [
            {
              connection_reference: prop['connection_reference'],
              connection_id: prop['connection_reference']
            }
          ]
        };
        this.eventos = [
          /*{
            url: this.urLanding + 'test',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Test de servicios.' }
          },*/
          {
            url: this.urLanding + 'preguntaracl',
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
            url: this.urLanding + 'guardaracl',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Obteniendo credenciales ACL.' }
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
    if ( this.cliente['b_emision'] || this.cliente['b_cancelacion'] || this.cliente['b_validacion'] ) {
      this.onProgress = true;
      this.completado = 0;

      this.loopEvents()
        .then( (res) => {
          this.open( res );
        });
    } else {
      const modalError = this._modalService.open( ModalComponent, { size: 'lg'} );
      modalError.componentInstance.inputs = {
        title: '¡WARNING!',
        typeClass: 'modal-header bg-warning text-white',
        textContent: 'Falta asignar tipo de servicios.'
      };
    }
  }

  public open( response: any ): void {
    const modalRef = this._modalService.open( ModalComponent, { size: 'lg'} );

    if ( response['continue'] ) {
      this.completado = 100;
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
      if ( this.completado === 100 ) {
        location.reload();
      }
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

              /*if ( data && data['response_type'] === 'UPDATE_PARAMS' ) {
                Object.keys( data ).map(key => {
                  console.log(key);
                  if ( key !== 'response_type' && key !== 'type' && key !== 'text' ) {
                    this.eventos[cont + 1][key] = data[key];
                  }
                });
              }*/
            })
            .catch( err => {
              continueLoop = false;
              console.error( err );
              reject(err);
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
