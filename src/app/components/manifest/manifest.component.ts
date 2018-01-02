import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AplicativoService } from '../../services/aplicativo.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-manifest',
  templateUrl: './manifest.component.html',
  styleUrls: ['./manifest.component.css']
})
export class ManifestComponent implements OnInit {
  public nId: number;
  public completado: number;
  public onProgress: boolean;
  public message: string;

  public urLanding: string;
  public contrato: any;
  public eventos: object [];

  constructor( private activatedRoute: ActivatedRoute,
               protected _aplicativoService: AplicativoService,
               private _modalService: NgbModal ) {
    this.activatedRoute.params.subscribe( params => {
      const hexid = params['id'];
      let strid = '';
      for (let x = 0; x < hexid.length; x += 2) {
        strid += String.fromCharCode(parseInt(hexid.substr(x, 2), 16));
      }

      this.nId = parseInt(strid, 10);
    });
  }

  ngOnInit() {
    this.contrato = {};
    this._aplicativoService.properties()
      .then( ( prop ) => {
        this.urLanding = prop['url-services'];
        this.contrato['connections'] = {
          references: [
            {
              connection_reference: prop['connection_reference'],
              connection_id: prop['connection_reference']
            }
          ]
        };
        this.eventos = [
          {
            url: this.urLanding + 'test',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Test de servicios.' }
          }/*,
          {
            url: this.urLanding + 'preguntaracl',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Obteniendo credenciales ACL.' }
          }*/
        ];
      });

    this.completado = 0;
    this.onProgress = false;
  }

  public onChange(e) {
    console.log(e);
  }

  public firmarContrato(): void {
    console.log( this.contrato );
    if ( this.contrato['b_cer'] || this.contrato['p_key'] ) {
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
        textContent: 'Falta arcivo .cer ó .key.'
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
        textContent: 'Contrato firmado correctamente.'
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
        // location.reload();
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
          item['body'] = this.contrato;
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
