import { OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { SPair, SColl, SByte } from '@fleet-sdk/serializer';
import { sha256, utf8 } from '@fleet-sdk/crypto';
import axios from 'axios';


const nft_data = [
    {
        "NFT Name/Title": "Bulk NFT Mushroom #1",
        "Description": "This is a bulk minted NFT with audio pairing.",
        "Number to mint": 1,
        "IPFS CID Audio": "ipfs://bafybeibozolkzncsjcehbf6uvki33ehfynn3g3ysvdke5vw5d7257kc7fy",
        "IPFS CID Image": "ipfs://bafybeie2tb3hkdlwshdfj2vvbkwkod7qjpn77w2ywich4kqqgj6uujqg2u"
    },
    {
        "NFT Name/Title": "Bulk NFT Mushroom #2",
        "Description": "This is a bulk minted NFT with audio pairing.",
        "Number to mint": 1,
        "IPFS CID Audio": "ipfs://bafybeibozolkzncsjcehbf6uvki33ehfynn3g3ysvdke5vw5d7257kc7fy",
        "IPFS CID Image": "ipfs://bafybeie2tb3hkdlwshdfj2vvbkwkod7qjpn77w2ywich4kqqgj6uujqg2u"
    }
  ]

  async function fetchFileBytesFromIPFS(ipfs_url: string): Promise<Uint8Array> {
    try {
      const response = await axios.get(ipfs_url, {
        responseType: 'arraybuffer', // to handle binary data
      });
      return new Uint8Array(response.data);
    } catch (error) {
      console.error(`Failed to fetch file from IPFS: ${error}`);
      throw new Error(`Could not fetch file from IPFS: ${error}`);
    }
  }

  // Main MintNFT function
export async function MintNFT() {
    console.log('Debug: nft_data is', nft_data);  // Debug line to check what nft_data holds
  
    if (!Array.isArray(nft_data)) {
      throw new Error('nft_data is not an array');  // Debug line to explicitly throw an error if nft_data is not an array
    }
    for (const nft of nft_data) {
      const ipfsImageURL = `https://gateway.ipfs.io/ipfs/${nft["IPFS CID Image"].split("ipfs://")[1]}`;  // IF AUDIO NFT, CHANGE TO nft["IPFS CID Audio"]
      const fileBytes = new Uint8Array(await fetchFileBytesFromIPFS(ipfsImageURL));
  
      const fileHash = sha256(fileBytes);
  
      if (await ergoConnector.nautilus.connect()) {
        const height = await ergo.get_current_height();
        const recipient = await ergo.get_change_address();
  
        const unsignedTx = new TransactionBuilder(height)
          .from(await ergo.get_utxos())
          .to(
            new OutputBuilder('1000000', recipient)
              .mintToken({ amount: nft["Number to mint"] })
              .setAdditionalRegisters({
                R4: SColl(SByte, utf8.decode(nft["NFT Name/Title"])).toHex(),
                R5: SColl(SByte, utf8.decode(nft["Description"])).toHex(),
                R6: SColl(SByte, utf8.decode('0')).toHex(), // 0 decimal places, so 1 whole token where 1 decimal place would be 1.0 tokens (.1 increments)
                R7: SColl(SByte, [0x01, 0x01]).toHex(), // 0x01, 0x01 is image // 0x01, 0x02 is audio
                R8: SColl(SByte, fileHash).toHex(),
                R9: SPair(
                  SColl(SByte, utf8.decode(nft["IPFS CID Image"])),
                  SColl(SByte, utf8.decode(nft["IPFS CID Audio"]))
                ).toHex(),
              })
          )
          .sendChangeTo(await ergo.get_change_address())
          .payMinFee()
          .build()
          .toEIP12Object();
  
        const signedTx = await ergo.sign_tx(unsignedTx);
        const txId = await ergo.submit_tx(signedTx);
  
        console.log(`Your tx ID for ${nft["NFT Name/Title"]} is: ${txId}`);
      }
    }
  }


  // Main BurntNFT function
  export async function BurnNFT() {
  
    if (await ergoConnector.nautilus.connect()) {
      const height = await ergo.get_current_height();
      const recipient = await ergo.get_change_address();

      const unsignedTx = new TransactionBuilder(height)
        .from(await ergo.get_utxos())
        .burnTokens({ 
          tokenId: "", // the token id you want to burn
          amount: "" // the amount of tokens you want to burn 
        }) 
        .sendChangeTo(await ergo.get_change_address())
        .payMinFee()
        .build()
        .toEIP12Object();

      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      console.log(`Your tx ID for the token burn is: ${txId}`);
    }
  }
  

  const BulkMint: React.FC = () => {
    const handleMintClick = async () => {
      await MintNFT();
    };

    const handleBurnClick = async () => {
        await BurnNFT();
      };


      return (
        <div>
          <button onClick={handleMintClick}>Mint NFTs</button>
          <br />
          <br />
          <button onClick={handleBurnClick}>Burn Duplicate or Incorrect NFT</button>
        </div>
      );
    };
    
    export default BulkMint;