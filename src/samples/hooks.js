
describe("Captain Hook", function() {
    before('look for Peter', function() {
        const wont_be_easy = true;
        chai.expect(wont_be_easy).to.be.true;
    });
    after('maybe next time', function() {
        const unlikely = true;
        chai.expect(unlikely).to.be.true;
    });
    beforeEach('the lost boys are coming', function() {
        const flying_fast = true;
        chai.expect(flying_fast).to.be.true;
    });
    afterEach("they're getting away", function() {
        const how_predictable = true;
        chai.expect(how_predictable).to.be.true;
    });
	
    describe("Ready the Jolly Roger", function() {
        before('grab the swords', function() {
            const nice_and_sharp = true;
            chai.expect(nice_and_sharp).to.be.true;
        });
        afterEach("oh no, it's the Pan", function() {
            const how_predictable = true;
            chai.expect(how_predictable).to.be.true;
        });
        it('catch `em', function() {
            const its_close = true;
            chai.expect(its_close).to.be.true;
        });

        describe("We got Wendy", function() {
            beforeEach('have Smee watch her', function() {
                const that_will_work = false;
                chai.expect(that_will_work).to.be.true;
            });
            it('walk the plank', function() {
                const didnt_see_that_coming = true;
                chai.expect(didnt_see_that_coming).to.be.true;
            });
    
            describe("Is that Tinker Bell?", function() {
                it('pixie dust is impressive', function() {
                    const makes_me_sneeze = false;
                    chai.expect(makes_me_sneeze).to.be.true;
                });
            });
        });
    });
});