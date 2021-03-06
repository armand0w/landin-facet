import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AplicativoService } from '../../services/aplicativo.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';

declare var SDSgLib_PKCS8: any;

@Component({
  selector: 'app-manifest',
  templateUrl: './manifest.component.html',
  styleUrls: ['./manifest.component.css']
})
export class ManifestComponent implements OnInit {
  public nId: number;
  public idExt: string;
  public completado: number;
  public onProgress: boolean;
  public message: string;
  public strContrato: object;

  public urLanding: string;
  public urlRadtExt: string;
  public contrato: any;
  public eventos: object [];

  public cipheredKey: string;
  public certX509: string;

  constructor( private activatedRoute: ActivatedRoute,
               private _aplicativoService: AplicativoService,
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
    this.strContrato = {};
    this._aplicativoService.properties()
      .then( ( prop ) => {
        this.urLanding = prop['url-services-manifest'];
        this.urlRadtExt = prop['url-radt-extractor'];
        this.idExt = prop['idExtractor'];
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
            url: this.urLanding + 'init',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Iniciando firmado de contrato.' }
          },
          {
            url: this.urLanding + 'firmar',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Firmando Documendo digitalmente.' }
          },
          {
            url: this.urLanding + 'finalizar',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8'
            },
            body: { message: 'Finalizando proceso de firmado digital.' }
          }
        ];
      })
      .then(() => {
        this._aplicativoService.consumirPromesa({
          url: this.urlRadtExt,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8'
          },
          body: {
            item_id: this.nId,
            id_extractor: this.idExt,
            connections: this.contrato['connections']
          }
        }).then( (data) => {
          this.strContrato = data['data'];
        });
      });

    this.completado = 0;
    this.onProgress = false;
  }

  public onChange(e, pair) {
    const reader = new FileReader();
    if ( e.target.files && e.target.files.length > 0 ) {
      const aux = e.target.files[0];
      let file = {};
      reader.readAsDataURL(aux);
      reader.onload = () => {
        file = {
          filename: aux.name,
          filetype: aux.type,
          array: {},
          value: reader.result.split(',')[1]
        };
        this.contrato[pair] = file;
      };
      reader.onerror = (err) => {
        console.error(err);
      };
    }
  }

  public firmarContrato(): void {
    if ( this.contrato['p_cer'] && this.contrato['p_key'] ) {
      this.onProgress = true;
      this.completado = 0;
      this.contrato['usuarios'] = this.strContrato;

      this.procesarArchivos();

      this.loopEvents()
        .then( (res) => {
          this.open( res );
        });
    } else {
      const modalError = this._modalService.open( ModalComponent, { size: 'sm'} );
      modalError.componentInstance.inputs = {
        title: '¡WARNING!',
        typeClass: 'modal-header bg-danger text-white',
        textContent: '<strong>Falta archivo .cer ó .key.</strong>'
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

  private procesarArchivos() {
    const privateKeyBufferString = SDSgLib_PKCS8.arrayBufferToString( this.contrato['p_key']['array'] );
    const pKey = privateKeyBufferString.replace(/(-----(BEGIN|END) PRIVATE KEY-----|\r\n)/g, '');

    if ( pKey.charAt(0) === 'M' ) {
      this.cipheredKey = window.atob(pKey);
    } else {
      this.cipheredKey = privateKeyBufferString;
    }

    const certificateBufferString = SDSgLib_PKCS8.arrayBufferToString( this.contrato['p_cer']['array'] );
    const pCert = certificateBufferString.replace(/(-----(BEGIN|END) CERTIFICATE-----|\r\n)/g, '');

    if ( pCert.charAt(0) === 'M' ) {
      this.certX509 = window.atob(pCert);
    } else {
      this.certX509 = certificateBufferString;
    }
    this.contrato['serialNumber'] = this.certX509.substring(15, 35);
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
