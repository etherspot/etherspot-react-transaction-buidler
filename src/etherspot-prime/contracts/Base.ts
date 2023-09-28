import { Contract } from 'etherspot';

export abstract class BaseContract extends Contract {
  public address: string;

  constructor(name: string, abi: any, address: string = null) {
    super(name, abi);
    this.address = address;
  }
}
