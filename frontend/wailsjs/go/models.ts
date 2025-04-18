export namespace main {
	
	export class Config {
	    steamid: string;
	    save_slot: number;
	    bucket_name: string;
	    blob_name: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.steamid = source["steamid"];
	        this.save_slot = source["save_slot"];
	        this.bucket_name = source["bucket_name"];
	        this.blob_name = source["blob_name"];
	    }
	}

}

