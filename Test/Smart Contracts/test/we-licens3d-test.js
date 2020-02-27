var Licens3dFiles = artifacts.require("Licens3dFiles");
var Licens3dReader = artifacts.require("Licens3dReader");
var Licens3dStorage = artifacts.require("Licens3dStorage");
var Licens3dConstants = artifacts.require("Licens3dConstants");

let Licens3dStorageContract, Licens3dFilesContract, Licens3dReaderContract, Licens3dConstantsContract;

let main, user1, user2, user3, user4;

contract('WeLicense Test', async(accounts) => {
    before(async () => {

        // User Accounts
        main = accounts[0];
        user1 = accounts[1];
        user2 = accounts[2];
        user3 = accounts[3];
        user4 = accounts[4];

        // Create the Smart Contracts
        Licens3dStorageContract = await Licens3dStorage.new();
        Licens3dFilesContract = await Licens3dFiles.new(Licens3dStorageContract.address);
        Licens3dReaderContract = await Licens3dReader.new(Licens3dStorageContract.address);
        Licens3dConstantsContract = await Licens3dConstants.new();

        // Set the current contract
        await Licens3dStorageContract.addWriter(Licens3dFilesContract.address);

    });


    it('Upload File', async () => {

        await Licens3dFilesContract.uploadFile(
            "RAaQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            "KAQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            "TCQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            {from: main}
        );

    });

    it('Have File Access', async () => {
        let hasAccess = await Licens3dReaderContract.haveFileAccess.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 2);
        assert.equal(hasAccess.valueOf(), true, "The account doesn't have access to the file, but have to");
    });

    it('Give File Access', async () => {

        let hasAccess = await Licens3dReaderContract.haveFileAccess.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 2, {from:  accounts[1]});
        assert.equal(hasAccess.valueOf(), false, "The account have access to the file, but haven't to");


        try{
            await Licens3dFilesContract.giveFileAccess(
                accounts[1],
                "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2tasdasdasd",
                6,
                "RAaQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
                "KAQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
                "TCQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
                2
            );
            assert(false, "The file hash has to be invalid.");
        }catch (e) {
            assert(true);
        }


        await Licens3dFilesContract.giveFileAccess(
            accounts[1],
            "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            6,
            "newRa",
            "KAQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            "TCQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            2
        );

        let hasAccessNewAccount = await Licens3dReaderContract.haveFileAccess.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 2, {from:  accounts[1]});
        assert.equal(hasAccessNewAccount.valueOf(), true, "The account doesn't have access to the file, but have to");

    });


    it('Change Permission To The File', async () => {

        try{

            await Licens3dFilesContract.changeTemporalPermissionsToTheFile(
                accounts[1],
                "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
                1, //PositionEdit
                4, //TEMPORARY_PERMISSION_TYPE_NUMBER_TIMES_LOAD_MODEL = 4;
                1
            );
        }catch (e) {
            console.log(e);
        }


        let action_view = 0;

        let hasAccessNewAccount = await Licens3dReaderContract.haveFileAccess.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", action_view, {from:  accounts[1]});
        assert.equal(hasAccessNewAccount.valueOf(), true, "The account doesn't have access to the file, but have to");


        await Licens3dFilesContract.updateFileAccess(
            "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t",
            1,
            1,
            {from: accounts[1]}
         );

        let hasAccess = await Licens3dReaderContract.haveFileAccess.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", action_view, {from: accounts[1]});
        assert.equal(hasAccess, false, "The Access is Incorrect");

    });

     it('Counts And Gets ', async () => {
        let permissionsList = await Licens3dReaderContract.getPermissionList.call(accounts[0], "QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t");
        assert.equal(permissionsList.valueOf()[0], 0x3f, "getPermissionList (upload): Permission List is not correct");

        let randomKey = await Licens3dReaderContract.getUserRandomKeyByFileHash.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t");
        assert.equal(randomKey.valueOf(), "RAaQmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", "The file hash doesn't exist");

        let fileProperties = await Licens3dReaderContract.getFileProperties.call("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t");
         assert.equal(fileProperties.valueOf()[1], accounts[0], "getFileProperties: Status is not correct");
    });

});
