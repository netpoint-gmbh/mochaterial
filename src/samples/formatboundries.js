describe("Suite Nesting", function() {
    describe("At some point", function() {
        describe("you should reconsider", function() {
            describe("just how deeply", function() {
                describe("you want to nest", function() {
                    describe("your mocha suites", function() {
                        it('you agree, right?', function() {
                            const this_is_too_deep = true;
                            chai.expect(this_is_too_deep).to.be.true;
                        });
                    });
                });
            });
        });
    });
});
describe("Test Descriptions", function() {
    it('There are tests whose descriptions are succinct, concise, or "to the point". This is not an example of one of those tests.', function() {
        const this_is_too_long = true;
        chai.expect(this_is_too_long).to.be.true;
    });
});