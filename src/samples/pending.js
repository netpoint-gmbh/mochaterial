describe("For a later date", function() {

    describe.skip("Suite pending via skip()", function() { 
        it('Would pass if not skipped', function () {
            chai.expect(true).to.equal(true);
        });
    });

    describe("Just pending tests", function() {
        it('Standard pending test');

        it.skip('Test pending via skip()', function() {
            // I'll never be shown
            chai.expect(true).to.be.true;
        });
    });
});