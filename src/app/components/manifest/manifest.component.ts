/// <reference types="crypto-js" />
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-manifest',
  templateUrl: './manifest.component.html',
  styleUrls: ['./manifest.component.css']
})
export class ManifestComponent implements OnInit {

  constructor( private activatedRoute: ActivatedRoute) {
    this.activatedRoute.params.subscribe( params => {
      console.log( params['id'] );

      const hexString = params['id'];
      let strOut = '';
      let x = 0;
      for (x = 0; x < hexString.length; x += 2) {
        strOut += String.fromCharCode(parseInt(hexString.substr(x, 2), 16));
      }
      console.log(strOut);

      let bytes  = CryptoJS.AES.decrypt(strOut.toString(), 'FacE-Timbre-v20');
      let plaintext = bytes.toString(CryptoJS.enc.Utf8);

      console.log(plaintext);
    });
  }

  ngOnInit() {
  }

}
