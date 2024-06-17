import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

//import { MasterEditionV2 } from "@coral-xyz/anchor/dist/cjs/utils";
import { SolanaTryNft } from "../target/types/solana_try_nft";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
    findMasterEditionPda,
    findMetadataPda,
    mplTokenMetadata,
    MPL_TOKEN_METADATA_PROGRAM_ID,


} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";

import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {min} from "bn.js";


describe("solana-try-nft", function() {
    // Configured the client to use the devnet cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.SolanaTryNft as Program<SolanaTryNft>;
        //.SolanaNftAnchor as Program<SolanaTryNft>;

    const signer = provider.wallet;

    const umi = createUmi("https://api.devnet.solana.com")
        .use(walletAdapterIdentity(signer))
        .use(mplTokenMetadata());

    const mint = anchor.web3.Keypair.generate();

    // Derive the associated token address account for the mint
    let associatedTokenAccount: anchor.web3.PublicKey;
    getAssociatedTokenAddress(mint.publicKey, signer.publicKey).then(addr => {
        associatedTokenAccount = addr;
    }).catch(err => {
        console.error('Error deriving associated token address:', err);
    });

    // derive the metadata account
    let metadataAccount = findMetadataPda(umi, {
        mint: publicKey(mint.publicKey),
    })[0];

    //derive the master edition pda
    let masterEditionAccount = findMasterEditionPda(
        umi, {mint: publicKey(mint.publicKey)}
    )[0];
    //let masterEditionAccountV2 = MasterEdition.getPDA(mint)


    const metadata = {
        name: "Kobeni",
        symbol: "kBN",
        uri: "https://raw.githubusercontent.com/687c/solana-nft-native-client/main/metadata.json",
    };

    it("mints nft!", function(done) {
        let tempAssociatedTokenAccount = associatedTokenAccount;
        getAssociatedTokenAddress(mint.publicKey, signer.publicKey).then(associatedTokenAccount => {

            program.methods
                .initialize(metadata.name, metadata.symbol, metadata.uri)
                .accounts({
                    signer: provider.publicKey,
                    mint: mint.publicKey,
                    associatedTokenAccount: tempAssociatedTokenAccount,
                    metadataAccount,
                    masterEditionAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([mint])
                .rpc()
                .then(tx => {
                    console.log(
                        `mint nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`
                    );
                    console.log(
                        `minted nft: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`
                    );
                    done();
                })
                .catch(err => {
                    console.error('Error minting NFT:', err);
                    done(err);
                });
        }).catch(err => {
            console.error('Error deriving associated token address:', err);
            done(err);
        });
    });

});