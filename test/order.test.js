import chai from 'chai';
import chaiHTTP from 'chai-http';
import jwt from 'jsonwebtoken';
import app from '../api/index';
import secret from '../api/util/jwt_secret';
import User from '../api/models/user';
import Caterer from '../api/models/caterer';
import Order from '../api/models/orders';
import Meal from '../api/models/meals';

const { assert, expect, use } = chai;

use(chaiHTTP);

const API_PREFIX = '/api/v1';

const userPayload = {
  name: 'Bruce Wayne',
  email: 'bruce@batman.com',
  phone: '07075748392',
  password: 'waynemanor'
};

const catererPayload = {
  name: 'Joffery Baratheon',
  phone: '07075748391',
  email: 'caterer@bookameal.com',
  catering_service: 'Iron Throne Eats',
  password: 'oursisthefury'
};

before(done => {
  User.create(userPayload)
    .then(() => {
      return Caterer.create(catererPayload);
    })
    .then(() => {
      done();
    });
});

describe('Caterer Get all Orders Endpoint Tests', () => {
  it(`GET ${API_PREFIX}/orders - Fetch All Orders (Unauthorized)`, done => {
    chai
      .request(app)
      .get(`${API_PREFIX}/orders`)
      .then(res => {
        expect(res).to.have.status(401);
        assert.equal(res.body.status, 'error');
        done();
      })
      .catch(err => console.log('GET /orders', err.message));
  });
  it(`GET ${API_PREFIX}/orders - Fetch All Orders - (Caterer Authorized)`, done => {
    Caterer.findOne({ where: { email: catererPayload.email } })
      .then(caterer => {
        const { id, name, email, phone } = caterer;
        const token = jwt.sign(
          {
            caterer: { id, name, email, phone },
            isCaterer: true
          },
          secret,
          {
            expiresIn: 86400
          }
        );
        chai
          .request(app)
          .get(`${API_PREFIX}/orders`)
          .set('Authorization', `Bearer ${token}`)
          .then(res => {
            expect(res).to.have.status(200);
            assert.equal(res.body.status, 'success');
            done();
          })
          .catch(err => console.log('GET /orders', err.message));
      })
      .catch(err => console.log(err.errors[0].name));
  });
});

describe('User can add to Orders Endpoint Tests', () => {
  Caterer.findOne({ where: { email: catererPayload.email } })
    .then(caterer => {
      return Meal.create({
        name: 'Dummy Meal',
        price: 500,
        imageUrl: 'fk.png',
        catererId: caterer.id
      });
    })
    .then(meal => {
      it(`POST ${API_PREFIX}/orders - Add To Orders (Unauthorized)`, done => {
        chai
          .request(app)
          .post(`${API_PREFIX}/orders`)
          .send({
            mealId: meal.id,
            quantity: 1
          })
          .then(res => {
            expect(res).to.have.status(401);
            assert.equal(res.body.status, 'error');
            done();
          })
          .catch(err => console.log('POST /orders', err.message));
      });
      it(`POST ${API_PREFIX}/orders - Add To Orders - (Validation Test)`, done => {
        User.findOne({ where: { email: userPayload.email } }).then(user => {
          const { id, name, email, phone } = user;
          const token = jwt.sign(
            {
              user: { id, name, email, phone }
            },
            secret,
            {
              expiresIn: 86400
            }
          );
          chai
            .request(app)
            .post(`${API_PREFIX}/orders`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              mealId: meal.id
            })
            .then(res => {
              expect(res).to.have.status(400);
              assert.equal(res.body.status, 'error');
              done();
            })
            .catch(err => console.log('POST /orders', err.message));
        });
      });
      it(`POST ${API_PREFIX}/orders - Add To Orders - (User can Add to Order)`, done => {
        User.findOne({ where: { email: userPayload.email } }).then(user => {
          const { id, name, email, phone } = user;
          const token = jwt.sign(
            {
              user: { id, name, email, phone }
            },
            secret,
            {
              expiresIn: 86400
            }
          );
          chai
            .request(app)
            .post(`${API_PREFIX}/orders`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              mealId: meal.id,
              quantity: 1
            })
            .then(res => {
              expect(res).to.have.status(200);
              assert.equal(res.body.status, 'success');
              done();
            })
            .catch(err => console.log('POST /orders', err.message));
        });
      });
      it(`POST ${API_PREFIX}/orders - Add To Orders - (User Cannot increament Order Item quantity from this route)`, done => {
        User.findOne({ where: { email: userPayload.email } }).then(user => {
          const { id, name, email, phone } = user;
          const token = jwt.sign(
            {
              user: { id, name, email, phone }
            },
            secret,
            {
              expiresIn: 86400
            }
          );
          chai
            .request(app)
            .post(`${API_PREFIX}/orders`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              mealId: meal.id,
              quantity: 1
            })
            .then(res => {
              expect(res).to.have.status(200);
              assert.equal(res.body.status, 'warning');
              Meal.destroy({ where: { id: meal.id } }).then(() => {
                done();
              });
            })
            .catch(err => console.log('POST /orders', err.message));
        });
      });
    })
    .catch(err => console.log(err.message));
});

after(done => {
  User.destroy({ where: { email: userPayload.email } })
    .then(() => {
      return Caterer.destroy({ where: { email: catererPayload.email } });
    })
    .then(() => {
      done();
    });
});
